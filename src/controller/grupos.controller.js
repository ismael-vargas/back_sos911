// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../Database/dataBase.sql'); // MySQL directo
const mongo = require('../Database/dataBase.mongo'); // Para Mongoose (MongoDB)

const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

const gruposCtl = {};

// --- Utilidad para Descifrado Seguro ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos:', error.message);
        return '';
    }
}

// Función para formatear una fecha a 'YYYY-MM-DD HH:mm:ss'
function formatLocalDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-index
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Utilidad para obtener el logger
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// 1. CREAR UN NUEVO GRUPO
gruposCtl.createGroup = async (req, res) => {
    const logger = getLogger(req);
    // Ahora esperamos clienteId y ciframos el nombre
    const { clienteId, nombre, descripcion, estado } = req.body; 

    logger.info(`[GRUPOS] Solicitud de creación de grupo: nombre=${nombre}, clienteId=${clienteId}`);

    try {
        // Validar campos obligatorios, incluyendo clienteId
        if (!clienteId || !nombre) {
            logger.warn('[GRUPOS] Creación fallida: los campos "clienteId" y "nombre" son obligatorios.');
            return res.status(400).json({ message: 'El clienteId y el nombre del grupo son requeridos.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);
        const nombreCifrado = cifrarDato(nombre);

        // Verificar si el grupo ya existe por nombre cifrado y clienteId (usando SQL directo)
        // Esto asume que un cliente no puede tener dos grupos con el mismo nombre
        const [existingGroupSQL] = await sql.promise().query(
            "SELECT id FROM grupos WHERE clienteId = ? AND nombre = ? AND estado = 'activo'", 
            [clienteId, nombreCifrado]
        );
        
        if (existingGroupSQL.length > 0) {
            logger.warn(`[GRUPOS] Creación fallida: El clienteId ${clienteId} ya tiene un grupo con el nombre "${nombre}" registrado.`);
            return res.status(409).json({ message: 'Ya tienes un grupo con ese nombre registrado.' });
        }

        // Crear grupo en la base de datos SQL usando ORM (orm.grupos.create())
        const nuevoGrupoSQL = {
            clienteId: clienteId,
            nombre: nombreCifrado,
            estado: estado || 'activo',
            fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
            // fecha_modificacion NO se incluye en la creación, se actualizará en modificaciones
        };
        const grupoGuardadoSQL = await orm.grupos.create(nuevoGrupoSQL);
        const idGrupoSql = grupoGuardadoSQL.id; // Obtener el ID insertado por ORM
        logger.info(`[GRUPOS] Grupo SQL creado exitosamente con ID: ${idGrupoSql} para clienteId: ${clienteId}`);

        // Crear documento en la base de datos MongoDB
        // fecha_creacion se establece, fecha_modificacion no se incluye en la creación inicial
        const nuevoGrupoMongo = { 
            idGrupoSql, 
            descripcion: descripcion || '', // La descripción es específica de Mongo
            estado: estado || 'activo', // Sincronizar estado con SQL
            fecha_creacion: formattedNow // Establecer fecha_creacion para Mongo (hora local formateada)
        };
        await mongo.Grupo.create(nuevoGrupoMongo);
        logger.info(`[GRUPOS] Grupo Mongo creado exitosamente para ID SQL: ${idGrupoSql}`);

        res.status(201).json({ 
            message: 'Grupo creado exitosamente.',
            grupoId: idGrupoSql
        });

    } catch (error) {
        logger.error(`[GRUPOS] Error al crear el grupo: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear el grupo.' });
    }
};

// 2. OBTENER TODOS LOS GRUPOS
gruposCtl.getAllGroups = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Para manejar borrado lógico
    logger.info(`[GRUPOS] Solicitud de obtención de todos los grupos (incluirEliminados: ${incluirEliminados})`);

    try {
        // Se usa la conexión 'sql' para una consulta directa
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE g.estado = 'activo'";
        // Unir con la tabla de clientes para obtener el nombre del cliente creador/propietario
        const [gruposSQL] = await sql.promise().query(
            `SELECT 
                g.id, 
                g.clienteId, 
                g.nombre, 
                g.estado, 
                g.fecha_creacion, 
                g.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo,
                (SELECT COUNT(*) FROM clientes_grupos cg WHERE cg.grupoId = g.id AND cg.estado = 'activo') AS miembros
            FROM 
                grupos g
            JOIN 
                clientes c ON g.clienteId = c.id
            ${estadoQuery}
            ORDER BY 
                g.fecha_creacion DESC`
        );
        
        const gruposCompletos = await Promise.all(
            gruposSQL.map(async (groupSQL) => {
                let grupoMongo = null;
                // SOLO si se encuentra un registro en SQL, intentamos buscar en Mongo
                if (groupSQL) {
                    grupoMongo = await mongo.Grupo.findOne({ idGrupoSql: groupSQL.id });
                }
                return {
                    id: groupSQL.id,
                    clienteId: groupSQL.clienteId,
                    nombre: safeDecrypt(groupSQL.nombre),
                    estado: groupSQL.estado,
                    descripcion: grupoMongo?.descripcion || '',
                    fecha_creacion_sql: groupSQL.fecha_creacion,
                    fecha_modificacion_sql: groupSQL.fecha_modificacion,
                    fecha_creacion_mongo: grupoMongo?.fecha_creacion || null,
                    fecha_modificacion_mongo: grupoMongo?.fecha_modificacion || null,
                    cliente_info: {
                        nombre: safeDecrypt(groupSQL.cliente_nombre),
                        correo_electronico: safeDecrypt(groupSQL.cliente_correo)
                    },
                    miembros: groupSQL.miembros // <--- Agrega esto
                };
            })
        );
        logger.info(`[GRUPOS] Se devolvieron ${gruposCompletos.length} grupos.`);
        res.status(200).json(gruposCompletos);
    } catch (error) {
        logger.error('Error al obtener todos los grupos:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener grupos.' });
    }
};

// 3. OBTENER GRUPO POR ID
gruposCtl.getGroupById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[GRUPOS] Solicitud de obtención de grupo por ID: ${id}`);

    try {
        // SQL directo para obtener grupo
        const [gruposSQL] = await sql.promise().query(
            `SELECT 
                g.id, 
                g.clienteId, 
                g.nombre, 
                g.estado, 
                g.fecha_creacion, 
                g.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                grupos g
            JOIN 
                clientes c ON g.clienteId = c.id
            WHERE 
                g.id = ? AND g.estado = 'activo'`, 
            [id]
        );
        
        if (gruposSQL.length === 0) {
            logger.warn(`[GRUPOS] Grupo no encontrado o eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Grupo no encontrado o eliminado.' });
        }
        
        const groupSQL = gruposSQL[0];
        logger.info(`[GRUPOS] Grupo SQL encontrado con ID: ${id}`);

        let grupoMongo = null;
        // SOLO si se encuentra un registro en SQL, intentamos buscar en Mongo
        if (groupSQL) {
            grupoMongo = await mongo.Grupo.findOne({ idGrupoSql: id });
        }
        logger.info(`[GRUPOS] Grupo Mongo encontrado para ID SQL: ${id}`);

        const grupoCompleto = {
            id: groupSQL.id,
            clienteId: groupSQL.clienteId,
            nombre: safeDecrypt(groupSQL.nombre), // Descifrar nombre
            estado: groupSQL.estado,
            descripcion: grupoMongo?.descripcion || '', // Descripción de Mongo
            fecha_creacion_sql: groupSQL.fecha_creacion,
            fecha_modificacion_sql: groupSQL.fecha_modificacion,
            fecha_creacion_mongo: grupoMongo?.fecha_creacion || null,
            fecha_modificacion_mongo: grupoMongo?.fecha_modificacion || null,
            cliente_info: {
                nombre: safeDecrypt(groupSQL.cliente_nombre),
                correo_electronico: safeDecrypt(groupSQL.cliente_correo)
            }
        };
        res.status(200).json(grupoCompleto);
    } catch (error) {
        logger.error('Error al obtener el grupo:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener el grupo.' });
    }
};

// 4. ACTUALIZAR GRUPO
gruposCtl.updateGroup = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    // No permitimos cambiar clienteId en la actualización directa del grupo
    const { nombre, descripcion, estado } = req.body; 
    logger.info(`[GRUPOS] Solicitud de actualización de grupo con ID: ${id}`);

    try {
        // Verificar si el grupo existe en SQL y está activo
        const [gruposSQL] = await sql.promise().query("SELECT * FROM grupos WHERE id = ? AND estado = 'activo'", [id]);
        if (gruposSQL.length === 0) {
            logger.warn(`[GRUPOS] Grupo no encontrado para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Grupo no encontrado o eliminado para actualizar.' });
        }
        const groupSQL = gruposSQL[0];

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar datos para SQL (solo los que no son undefined)
        const camposSQL = [];
        const valoresSQL = [];
        
        if (nombre !== undefined) {
            const nombreCifrado = cifrarDato(nombre);
            // Verificar si el nuevo nombre ya existe para otro grupo activo del MISMO cliente
            const [existingGroupWithNewName] = await sql.promise().query(
                "SELECT id FROM grupos WHERE clienteId = ? AND nombre = ? AND id != ? AND estado = 'activo'",
                [groupSQL.clienteId, nombreCifrado, id]
            );
            if (existingGroupWithNewName.length > 0) {
                logger.warn(`[GRUPOS] Actualización fallida: El nuevo nombre de grupo "${nombre}" ya está registrado para este cliente.`);
                return res.status(409).json({ message: 'Ya tienes un grupo con ese nombre registrado.' });
            }
            camposSQL.push('nombre = ?');
            valoresSQL.push(nombreCifrado); // Cifrar nombre al actualizar
        }
        if (estado !== undefined) {
            camposSQL.push('estado = ?');
            valoresSQL.push(estado);
        }

        // Solo actualizar SQL si hay campos para actualizar
        if (camposSQL.length > 0) {
            camposSQL.push('fecha_modificacion = ?');
            valoresSQL.push(formattedNow);
            valoresSQL.push(id);
            const consultaSQL = `UPDATE grupos SET ${camposSQL.join(', ')} WHERE id = ?`;
            const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, valoresSQL);
            
            if (resultadoSQLUpdate.affectedRows === 0) {
                logger.warn(`[GRUPOS] No se pudo actualizar el grupo SQL con ID: ${id}.`);
            } else {
                logger.info(`[GRUPOS] Grupo SQL actualizado con ID: ${id}`);
            }
        }

        // Preparar datos para actualización en MongoDB
        const updateDataMongo = {};
        if (descripcion !== undefined) updateDataMongo.descripcion = descripcion;
        // Replicar el estado si se actualiza en SQL
        if (estado !== undefined) updateDataMongo.estado = estado;

        // Siempre actualizar fecha_modificacion en Mongo
        updateDataMongo.fecha_modificacion = formattedNow; // CAMBIO: Usar formattedNow

        // Realizar actualización en MongoDB
        if (Object.keys(updateDataMongo).length > 0) {
            await mongo.Grupo.updateOne({ idGrupoSql: id }, { $set: updateDataMongo });
            logger.info(`[GRUPOS] Grupo Mongo actualizado para ID SQL: ${id}`);
        }
        
        // Obtener el grupo actualizado para la respuesta
        const [updatedGroupSQL] = await sql.promise().query(
            `SELECT 
                g.id, 
                g.clienteId, 
                g.nombre, 
                g.estado, 
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                grupos g
            JOIN 
                clientes c ON g.clienteId = c.id
            WHERE 
                g.id = ?`, 
            [id]
        );
        const updatedGroup = updatedGroupSQL[0];
        const updatedGroupMongo = await mongo.Grupo.findOne({ idGrupoSql: id });

        res.status(200).json({ 
            message: 'Grupo actualizado correctamente.',
            grupo: {
                id: updatedGroup.id,
                clienteId: updatedGroup.clienteId,
                nombre: safeDecrypt(updatedGroup.nombre), // Descifrar nombre
                estado: updatedGroup.estado,
                descripcion: updatedGroupMongo?.descripcion || '',
                cliente_info: {
                    nombre: safeDecrypt(updatedGroup.cliente_nombre),
                    correo_electronico: safeDecrypt(updatedGroup.cliente_correo)
                }
            }
        });

    } catch (error) {
        logger.error('Error al actualizar el grupo:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el grupo.' });
    }
};

// 5. ELIMINAR GRUPO (Borrado Lógico)
gruposCtl.deleteGroup = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[GRUPOS] Solicitud de eliminación lógica de grupo con ID: ${id}`);

    try {
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultadoSQL] = await sql.promise().query("UPDATE grupos SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", [formattedNow, id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.warn(`[GRUPOS] Grupo no encontrado o ya eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Grupo no encontrado o ya estaba eliminado.' });
        }
        logger.info(`[GRUPOS] Grupo SQL marcado como eliminado con ID: ${id}`);

        // Actualizar estado a 'eliminado' en MongoDB
        await mongo.Grupo.updateOne(
            { idGrupoSql: id }, 
            { $set: { estado: 'eliminado', fecha_modificacion: formattedNow } }
        );
        logger.info(`[GRUPOS] Grupo Mongo marcado como eliminado para ID SQL: ${id}`);
        
        res.status(200).json({ message: 'Grupo marcado como eliminado exitosamente.' });
    } catch (error) {
        logger.error('Error al eliminar el grupo:', error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar el grupo.' });
    }
};

module.exports = gruposCtl;
