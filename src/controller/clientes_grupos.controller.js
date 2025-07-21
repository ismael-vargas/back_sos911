// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL) - Necesario para las relaciones
const sql = require('../Database/dataBase.sql'); // Para MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Se mantiene por consistencia

const clientesGruposCtl = {};

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

// 1. CREAR UNA NUEVA RELACIÓN CLIENTE-GRUPO (POST /clientes_grupos/crear)
clientesGruposCtl.createClientGroup = async (req, res) => {
    const logger = getLogger(req);
    // Usamos clienteId y grupoId para que coincidan con las columnas de la DB (camelCase generada por Sequelize)
    const { clienteId, grupoId, estado } = req.body; 
    logger.info(`[CLIENTES_GRUPOS] Intento de creación de relación: clienteId=${clienteId}, grupoId=${grupoId}`);

    // Validar campos obligatorios
    if (!clienteId || !grupoId) {
        logger.warn('[CLIENTES_GRUPOS] Creación fallida: campos obligatorios faltantes.');
        return res.status(400).json({ message: 'Los campos clienteId y grupoId son requeridos.' });
    }

    try {
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Verificar si la relación ya existe (usando SQL directo)
        const [existingRelationSQL] = await sql.promise().query(
            "SELECT id FROM clientes_grupos WHERE clienteId = ? AND grupoId = ? AND estado = 'activo'", 
            [clienteId, grupoId]
        );
        
        if (existingRelationSQL.length > 0) {
            logger.warn(`[CLIENTES_GRUPOS] La relación clienteId=${clienteId} y grupoId=${grupoId} ya existe.`);
            return res.status(409).json({ message: 'La relación cliente-grupo ya está registrada.' });
        }

        // Crear la nueva relación usando ORM (como usuario.controller.js)
        const nuevaRelacionGrupo = await orm.clientes_grupos.create({
            clienteId: clienteId,
            grupoId: grupoId,
            estado: estado || 'activo',
            fecha_creacion: formattedNow, // (hora local formateada)
        });
        const newRelationId = nuevaRelacionGrupo.id; // Obtener el ID insertado por ORM
        logger.info(`[CLIENTES_GRUPOS] Relación creada exitosamente con ID: ${newRelationId}.`);

        // Obtener la relación recién creada para la respuesta
        const [createdRelationSQL] = await sql.promise().query("SELECT * FROM clientes_grupos WHERE id = ?", [newRelationId]);
        const createdRelation = createdRelationSQL[0];

        res.status(201).json({
            message: 'Relación cliente-grupo creada exitosamente.',
            clienteGrupo: {
                id: createdRelation.id,
                clienteId: createdRelation.clienteId,
                grupoId: createdRelation.grupoId,
                estado: createdRelation.estado,
                fecha_creacion: createdRelation.fecha_creacion,
                fecha_modificacion: createdRelation.fecha_modificacion // Puede ser null si no se ha modificado
            }
        });
    } catch (error) {
        console.error(`[CLIENTES_GRUPOS] Error al crear la relación cliente-grupo: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear la relación cliente-grupo.' });
    }
};

// 2. OBTENER TODAS LAS RELACIONES CLIENTE-GRUPO (GET /clientes_grupos/listar)
clientesGruposCtl.getAllClientGroups = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Para manejar borrado lógico
    logger.info(`[CLIENTES_GRUPOS] Solicitud de listado de relaciones cliente-grupo (incluirEliminados: ${incluirEliminados})`);

    try {
        // Se usa la conexión 'sql' para una consulta directa
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE cg.estado = 'activo'";
        // Unir con clientes y grupos para obtener información detallada
        const [relationsSQL] = await sql.promise().query(
            `SELECT 
                cg.id, 
                cg.clienteId, 
                cg.grupoId, 
                cg.estado, 
                cg.fecha_creacion, 
                cg.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo,
                g.nombre AS grupo_nombre,
                g.estado AS grupo_estado
            FROM 
                clientes_grupos cg
            JOIN 
                clientes c ON cg.clienteId = c.id
            JOIN
                grupos g ON cg.grupoId = g.id
            ${estadoQuery}
            ORDER BY 
                cg.fecha_creacion DESC`
        );
        
        // Descifrar los campos sensibles antes de enviar
        const relationsCompletas = relationsSQL.map(relSQL => ({
            id: relSQL.id,
            clienteId: relSQL.clienteId,
            grupoId: relSQL.grupoId,
            estado: relSQL.estado,
            fecha_creacion: relSQL.fecha_creacion,
            fecha_modificacion: relSQL.fecha_modificacion,
            cliente_info: {
                nombre: safeDecrypt(relSQL.cliente_nombre), // Descifrar nombre del cliente
                correo_electronico: safeDecrypt(relSQL.cliente_correo) // Descifrar correo del cliente
            },
            grupo_info: {
                nombre: safeDecrypt(relSQL.grupo_nombre), // Descifrar nombre del grupo (si se cifró)
                estado: relSQL.grupo_estado
            }
        }));

        logger.info(`[CLIENTES_GRUPOS] Se devolvieron ${relationsCompletas.length} relaciones cliente-grupo.`);
        res.status(200).json(relationsCompletas);
    } catch (error) {
        console.error('Error al obtener las relaciones cliente-grupo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener las relaciones cliente-grupo.' });
    }
};

// 3. OBTENER UNA RELACIÓN CLIENTE-GRUPO POR ID (GET /clientes_grupos/detalle/:id)
clientesGruposCtl.getClientGroupById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[CLIENTES_GRUPOS] Solicitud de relación cliente-grupo por ID: ${id}`);
    try {
        // Usar SQL directo para obtener la relación por ID
        const [relationSQL] = await sql.promise().query("SELECT * FROM clientes_grupos WHERE id = ? AND estado = 'activo'", [id]);

        if (relationSQL.length === 0) {
            logger.warn(`[CLIENTES_GRUPOS] Relación cliente-grupo no encontrada o inactiva con ID: ${id}`);
            return res.status(404).json({ error: 'Relación cliente-grupo no encontrada o inactiva.' });
        }
        
        const relation = relationSQL[0];
        logger.info(`[CLIENTES_GRUPOS] Relación cliente-grupo encontrada con ID: ${id}.`);

        res.status(200).json({
            id: relation.id,
            clienteId: relation.clienteId,
            grupoId: relation.grupoId,
            estado: relation.estado,
            fecha_creacion: relation.fecha_creacion,
            fecha_modificacion: relation.fecha_modificacion
        });
    } catch (error) {
        console.error('Error al obtener la relación cliente-grupo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener la relación cliente-grupo.' });
    }
};

// 4. ACTUALIZAR UNA RELACIÓN CLIENTE-GRUPO POR ID (PUT /clientes_grupos/actualizar/:id)
clientesGruposCtl.updateClientGroup = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    // Solo permitimos actualizar el estado de la relación
    const { estado } = req.body; 
    logger.info(`[CLIENTES_GRUPOS] Solicitud de actualización de relación cliente-grupo con ID: ${id}`);

    try {
        // Validar campos a actualizar
        if (estado === undefined) {
            logger.warn(`[CLIENTES_GRUPOS] No se proporcionaron campos para actualizar la relación con ID: ${id}.`);
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar (solo se permite "estado").' });
        }

        // Verificar si la relación existe y está activa
        const [existingRelationSQL] = await sql.promise().query("SELECT id FROM clientes_grupos WHERE id = ? AND estado = 'activo'", [id]);
        if (existingRelationSQL.length === 0) {
            logger.warn(`[CLIENTES_GRUPOS] Relación cliente-grupo no encontrada o inactiva para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Relación cliente-grupo no encontrada o inactiva para actualizar.' });
        }
        
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Actualizar estado usando SQL directo
        const [resultadoSQLUpdate] = await sql.promise().query(
            "UPDATE clientes_grupos SET estado = ?, fecha_modificacion = ? WHERE id = ?", 
            [estado, formattedNow, id] // CAMBIO: Usar formattedNow
        );
        
        if (resultadoSQLUpdate.affectedRows === 0) {
            logger.warn(`[CLIENTES_GRUPOS] No se pudo actualizar la relación cliente-grupo SQL con ID: ${id}.`);
        } else {
            logger.info(`[CLIENTES_GRUPOS] Relación cliente-grupo SQL actualizada con ID: ${id}`);
        }
        
        // Obtener la relación actualizada para la respuesta
        const [updatedRelationSQL] = await sql.promise().query("SELECT * FROM clientes_grupos WHERE id = ?", [id]);
        const updatedRelation = updatedRelationSQL[0];

        res.status(200).json({ 
            message: 'Relación cliente-grupo actualizada correctamente.',
            clienteGrupo: {
                id: updatedRelation.id,
                clienteId: updatedRelation.clienteId,
                grupoId: updatedRelation.grupoId,
                estado: updatedRelation.estado,
                fecha_creacion: updatedRelation.fecha_creacion,
                fecha_modificacion: updatedRelation.fecha_modificacion
            }
        });

    } catch (error) {
        console.error('Error al actualizar la relación cliente-grupo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la relación cliente-grupo.' });
    }
};

// 5. ELIMINAR UNA RELACIÓN CLIENTE-GRUPO (Borrado Lógico) (DELETE /clientes_grupos/eliminar/:id)
clientesGruposCtl.deleteClientGroup = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[CLIENTES_GRUPOS] Solicitud de eliminación lógica de relación cliente-grupo con ID: ${id}`);
    try {
        // Verificar existencia y estado
        const [existingRelationSQL] = await sql.promise().query("SELECT id FROM clientes_grupos WHERE id = ? AND estado = 'activo'", [id]);
        if (existingRelationSQL.length === 0) {
            logger.warn(`[CLIENTES_GRUPOS] Relación cliente-grupo no encontrada o ya eliminada con ID: ${id}`);
            return res.status(404).json({ error: 'Relación cliente-grupo no encontrada o ya estaba eliminado.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado en SQL directo
        const [resultadoSQL] = await sql.promise().query("UPDATE clientes_grupos SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.error(`[CLIENTES_GRUPOS] No se pudo marcar como eliminado la relación cliente-grupo con ID: ${id}.`);
            return res.status(500).json({ error: 'No se pudo eliminar la relación cliente-grupo.' });
        }

        logger.info(`[CLIENTES_GRUPOS] Relación cliente-grupo marcada como eliminada: id=${id}`);
        res.status(200).json({ message: 'Relación cliente-grupo marcada como eliminado correctamente.' });
    } catch (error) {
        console.error('Error al borrar la relación cliente-grupo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al borrar la relación cliente-grupo.' });
    }
};

module.exports = clientesGruposCtl;
