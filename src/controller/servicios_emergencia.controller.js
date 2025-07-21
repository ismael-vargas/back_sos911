// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL) - Necesario para relaciones
const sql = require('../Database/dataBase.sql'); // MySQL directo
const mongo = require('../Database/dataBase.mongo'); // Para Mongoose (MongoDB)

const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

const serviciosEmergenciaCtl = {};

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

// 1. CREAR UN NUEVO SERVICIO DE EMERGENCIA
serviciosEmergenciaCtl.createEmergencyService = async (req, res) => {
    const logger = getLogger(req);
    const { nombre, descripcion, telefono, estado, usuarioId } = req.body;

    logger.info(`[SERVICIOS_EMERGENCIA] Solicitud de creación: nombre=${nombre}, usuarioId=${usuarioId}`);

    try {
        // Validar campos obligatorios
        if (!nombre || !telefono || !usuarioId) {
            logger.warn('[SERVICIOS_EMERGENCIA] Creación fallida: campos obligatorios faltantes.');
            return res.status(400).json({ message: 'Nombre, teléfono y usuarioId son obligatorios.' });
        }

        // Validar que el usuarioId exista y esté activo en la tabla de usuarios
        const [existingUserSQL] = await sql.promise().query("SELECT id FROM usuarios WHERE id = ? AND estado = 'activo'", [usuarioId]);
        if (existingUserSQL.length === 0) {
            logger.warn(`[SERVICIOS_EMERGENCIA] Creación fallida: El usuario con ID ${usuarioId} no existe o no está activo.`);
            return res.status(400).json({ message: 'El usuario asociado no existe o no está activo.' });
        }
        logger.info(`[SERVICIOS_EMERGENCIA] Usuario con ID ${usuarioId} verificado.`);

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Cifrar los campos sensibles para SQL
        const nombreCifrado = cifrarDato(nombre);
        const telefonoCifrado = cifrarDato(telefono);

        // Verificar si el servicio ya existe por nombre y usuarioId (usando SQL directo)
        const [existingServiceSQL] = await sql.promise().query(
            "SELECT id FROM servicios_emergencia WHERE nombre = ? AND usuarioId = ? AND estado = 'activo'", 
            [nombreCifrado, usuarioId]
        );
        
        if (existingServiceSQL.length > 0) {
            logger.warn(`[SERVICIOS_EMERGENCIA] Creación fallida: El servicio "${nombre}" ya está registrado para el usuarioId ${usuarioId}.`);
            return res.status(409).json({ message: 'El servicio de emergencia ya está registrado con ese nombre para este usuario.' });
        }

        // Crear servicio en la base de datos SQL usando ORM (orm.servicios_emergencia.create())
        // fecha_modificacion NO se incluye en la creación, se actualizará en modificaciones
        const nuevoServicioSQL = {
            nombre: nombreCifrado,
            telefono: telefonoCifrado,
            estado: estado || 'activo',
            usuarioId: usuarioId,
            fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
        };
        const servicioGuardadoSQL = await orm.servicios_emergencia.create(nuevoServicioSQL); // Usando ORM para crear
        const idServicioEmergenciaSql = servicioGuardadoSQL.id; // Obtener el ID insertado por ORM
        logger.info(`[SERVICIOS_EMERGENCIA] Servicio SQL creado exitosamente con ID: ${idServicioEmergenciaSql} usando ORM.`);

        // Crear documento en la base de datos MongoDB
        // fecha_creacion se establece, fecha_modificacion no se incluye en la creación inicial
        await mongo.ServicioEmergencia.create({ 
            idServicioEmergenciaSql, 
            descripcion: descripcion || '', // La descripción es específica de Mongo
            estado: estado || 'activo', // Sincronizar estado con SQL
            fecha_creacion: formattedNow // Establecer fecha_creacion para Mongo (hora local formateada)
        });
        logger.info(`[SERVICIOS_EMERGENCIA] Servicio Mongo creado exitosamente para ID SQL: ${idServicioEmergenciaSql}`);

        res.status(201).json({ 
            message: 'Servicio de emergencia creado exitosamente.',
            servicioId: idServicioEmergenciaSql
        });

    } catch (error) {
        logger.error(`[SERVICIOS_EMERGENCIA] Error al crear el servicio: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear el servicio de emergencia.' });
    }
};

// 2. OBTENER TODOS LOS SERVICIOS DE EMERGENCIA
serviciosEmergenciaCtl.getAllEmergencyServices = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Para manejar borrado lógico
    logger.info(`[SERVICIOS_EMERGENCIA] Solicitud de obtención de todos los servicios (incluirEliminados: ${incluirEliminados})`);

    try {
        // Se usa la conexión 'sql' para una consulta directa
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE se.estado = 'activo'";
        // Unir con la tabla de usuarios para obtener el nombre del usuario que lo gestiona
        const [serviciosSQL] = await sql.promise().query(
            `SELECT 
                se.id, 
                se.nombre, 
                se.telefono, 
                se.estado, 
                se.usuarioId,
                se.fecha_creacion, 
                se.fecha_modificacion,
                u.nombre AS usuario_nombre,
                u.correo_electronico AS usuario_correo
            FROM 
                servicios_emergencia se
            JOIN 
                usuarios u ON se.usuarioId = u.id
            ${estadoQuery}
            ORDER BY 
                se.fecha_creacion DESC`
        );
        
        const serviciosCompletos = await Promise.all(
            serviciosSQL.map(async (serviceSQL) => {
                let servicioMongo = null;
                // SOLO si se encuentra un registro en SQL, intentamos buscar en Mongo
                if (serviceSQL) {
                    servicioMongo = await mongo.ServicioEmergencia.findOne({ idServicioEmergenciaSql: serviceSQL.id });
                }
                return {
                    id: serviceSQL.id,
                    nombre: safeDecrypt(serviceSQL.nombre), // Descifrar nombre
                    telefono: safeDecrypt(serviceSQL.telefono), // Descifrar teléfono
                    estado: serviceSQL.estado,
                    usuarioId: serviceSQL.usuarioId,
                    descripcion: servicioMongo?.descripcion || '', // Descripción de Mongo
                    fecha_creacion_sql: serviceSQL.fecha_creacion,
                    fecha_modificacion_sql: serviceSQL.fecha_modificacion,
                    fecha_creacion_mongo: servicioMongo?.fecha_creacion || null,
                    fecha_modificacion_mongo: servicioMongo?.fecha_modificacion || null,
                    usuario_info: {
                        nombre: safeDecrypt(serviceSQL.usuario_nombre),
                        correo_electronico: safeDecrypt(serviceSQL.correo_usuario)
                    }
                };
            })
        );
        logger.info(`[SERVICIOS_EMERGENCIA] Se devolvieron ${serviciosCompletos.length} servicios.`);
        res.status(200).json(serviciosCompletos);
    } catch (error) {
        logger.error('Error al obtener todos los servicios de emergencia:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener servicios de emergencia.' });
    }
};

// 3. OBTENER SERVICIO DE EMERGENCIA POR ID
serviciosEmergenciaCtl.getEmergencyServiceById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[SERVICIOS_EMERGENCIA] Solicitud de obtención de servicio por ID: ${id}`);

    try {
        // SQL directo para obtener servicio
        const [serviciosSQL] = await sql.promise().query(
            `SELECT 
                se.id, 
                se.nombre, 
                se.telefono, 
                se.estado, 
                se.usuarioId,
                se.fecha_creacion, 
                se.fecha_modificacion,
                u.nombre AS usuario_nombre,
                u.correo_electronico AS usuario_correo
            FROM 
                servicios_emergencia se
            JOIN 
                usuarios u ON se.usuarioId = u.id
            WHERE 
                se.id = ? AND se.estado = 'activo'`, 
            [id]
        );
        
        if (serviciosSQL.length === 0) {
            logger.warn(`[SERVICIOS_EMERGENCIA] Servicio no encontrado o eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Servicio no encontrado o eliminado.' });
        }
        
        const serviceSQL = serviciosSQL[0];
        logger.info(`[SERVICIOS_EMERGENCIA] Servicio SQL encontrado con ID: ${id}`);

        let servicioMongo = null;
        // SOLO si se encuentra un registro en SQL, intentamos buscar en Mongo
        if (serviceSQL) {
            servicioMongo = await mongo.ServicioEmergencia.findOne({ idServicioEmergenciaSql: id });
        }
        logger.info(`[SERVICIOS_EMERGENCIA] Servicio Mongo encontrado para ID SQL: ${id}`);

        const servicioCompleto = {
            id: serviceSQL.id,
            nombre: safeDecrypt(serviceSQL.nombre), // Descifrar nombre
            telefono: safeDecrypt(serviceSQL.telefono), // Descifrar teléfono // CORREGIDO: Usar serviceSQL.telefono
            estado: serviceSQL.estado,
            usuarioId: serviceSQL.usuarioId,
            descripcion: servicioMongo?.descripcion || '', // Descripción de Mongo
            fecha_creacion_sql: serviceSQL.fecha_creacion,
            fecha_modificacion_sql: serviceSQL.fecha_modificacion,
            fecha_creacion_mongo: servicioMongo?.fecha_creacion || null,
            fecha_modificacion_mongo: servicioMongo?.fecha_modificacion || null,
            usuario_info: {
                nombre: safeDecrypt(serviceSQL.usuario_nombre),
                correo_electronico: safeDecrypt(serviceSQL.correo_usuario)
            }
        };
        res.status(200).json(servicioCompleto);
    } catch (error) {
        logger.error('Error al obtener el servicio de emergencia:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener servicios de emergencia.' });
    }
};

// 4. ACTUALIZAR SERVICIO DE EMERGENCIA
serviciosEmergenciaCtl.updateEmergencyService = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { nombre, descripcion, telefono, estado, usuarioId } = req.body; // Añadido usuarioId para posible validación si se cambia

    logger.info(`[SERVICIOS_EMERGENCIA] Solicitud de actualización de servicio con ID: ${id}`);

    try {
        // Verificar si el servicio existe en SQL y está activo
        const [serviciosSQL] = await sql.promise().query("SELECT * FROM servicios_emergencia WHERE id = ? AND estado = 'activo'", [id]);
        if (serviciosSQL.length === 0) {
            logger.warn(`[SERVICIOS_EMERGENCIA] Servicio no encontrado para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Servicio no encontrado o eliminado para actualizar.' });
        }
        const serviceSQL = serviciosSQL[0];

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Validar que el nuevo usuarioId (si se proporciona) exista y esté activo
        if (usuarioId !== undefined && usuarioId !== serviceSQL.usuarioId) {
            const [newExistingUserSQL] = await sql.promise().query("SELECT id FROM usuarios WHERE id = ? AND estado = 'activo'", [usuarioId]);
            if (newExistingUserSQL.length === 0) {
                logger.warn(`[SERVICIOS_EMERGENCIA] Actualización fallida: El nuevo usuario con ID ${usuarioId} no existe o no está activo.`);
                return res.status(400).json({ message: 'El nuevo usuario asociado no existe o no está activo.' });
            }
            logger.info(`[SERVICIOS_EMERGENCIA] Nuevo usuario con ID ${usuarioId} verificado para actualización.`);
        }

        // Preparar datos para SQL (solo los que no son undefined)
        const camposSQL = [];
        const valoresSQL = [];
        
        if (nombre !== undefined) {
            const nombreCifrado = cifrarDato(nombre);
            // Opcional: Verificar si el nuevo nombre ya existe para otro servicio activo del MISMO usuario
            const targetUsuarioId = usuarioId !== undefined ? usuarioId : serviceSQL.usuarioId; // Usar el nuevo ID si se cambia, sino el original
            const [existingServiceWithNewName] = await sql.promise().query(
                "SELECT id FROM servicios_emergencia WHERE usuarioId = ? AND nombre = ? AND id != ? AND estado = 'activo'",
                [targetUsuarioId, nombreCifrado, id]
            );
            if (existingServiceWithNewName.length > 0) {
                logger.warn(`[SERVICIOS_EMERGENCIA] Actualización fallida: El nuevo nombre de servicio "${nombre}" ya está registrado para este usuario.`);
                return res.status(409).json({ message: 'Ya tienes un servicio con ese nombre registrado para este usuario.' });
            }
            camposSQL.push('nombre = ?');
            valoresSQL.push(nombreCifrado); // Cifrar nombre al actualizar
        }
        if (telefono !== undefined) {
            camposSQL.push('telefono = ?');
            valoresSQL.push(cifrarDato(telefono)); // Cifrar teléfono al actualizar
        }
        if (estado !== undefined) {
            camposSQL.push('estado = ?');
            valoresSQL.push(estado);
        }
        if (usuarioId !== undefined) { // Permitir cambiar el usuarioId si se valida
            camposSQL.push('usuarioId = ?');
            valoresSQL.push(usuarioId);
        }

        // Solo actualizar SQL si hay campos para actualizar
        if (camposSQL.length > 0) {
            valoresSQL.push(id); // Para el WHERE
            const consultaSQL = `UPDATE servicios_emergencia SET ${camposSQL.join(', ')}, fecha_modificacion = ? WHERE id = ?`; // CAMBIO: Usar formattedNow
            const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, [...valoresSQL, formattedNow, id]); // CAMBIO: Pasar formattedNow
            
            if (resultadoSQLUpdate.affectedRows === 0) {
                logger.warn(`[SERVICIOS_EMERGENCIA] No se pudo actualizar el servicio SQL con ID: ${id}.`);
            } else {
                logger.info(`[SERVICIOS_EMERGENCIA] Servicio SQL actualizado con ID: ${id}`);
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
            await mongo.ServicioEmergencia.updateOne({ idServicioEmergenciaSql: id }, { $set: updateDataMongo });
            logger.info(`[SERVICIOS_EMERGENCIA] Servicio Mongo actualizado para ID SQL: ${id}`);
        }
        
        // Obtener el servicio actualizado para la respuesta
        const [updatedServiceSQL] = await sql.promise().query(
            `SELECT 
                se.id, 
                se.nombre, 
                se.telefono, 
                se.estado, 
                se.usuarioId,
                u.nombre AS usuario_nombre,
                u.correo_electronico AS usuario_correo
            FROM 
                servicios_emergencia se
            JOIN 
                usuarios u ON se.usuarioId = u.id
            WHERE 
                se.id = ?`, 
            [id]
        );
        const updatedService = updatedServiceSQL[0];
        const updatedServiceMongo = await mongo.ServicioEmergencia.findOne({ idServicioEmergenciaSql: id });

        res.status(200).json({ 
            message: 'Servicio de emergencia actualizado correctamente.',
            servicio: {
                id: updatedService.id,
                nombre: safeDecrypt(updatedService.nombre),
                telefono: safeDecrypt(updatedService.telefono),
                estado: updatedService.estado,
                usuarioId: updatedService.usuarioId,
                descripcion: updatedServiceMongo?.descripcion || '',
                usuario_info: {
                    nombre: safeDecrypt(updatedService.usuario_nombre),
                    correo_electronico: safeDecrypt(updatedService.correo_usuario)
                }
            }
        });

    } catch (error) {
        logger.error('Error al actualizar el servicio de emergencia:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el servicio de emergencia.' });
    }
};

// 5. ELIMINAR SERVICIO DE EMERGENCIA (Borrado Lógico)
serviciosEmergenciaCtl.deleteEmergencyService = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[SERVICIOS_EMERGENCIA] Solicitud de eliminación lógica de servicio con ID: ${id}`);

    try {
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultadoSQL] = await sql.promise().query("UPDATE servicios_emergencia SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", [formattedNow, id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.warn(`[SERVICIOS_EMERGENCIA] Servicio no encontrado o ya eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Servicio no encontrado o ya estaba eliminado.' });
        }
        logger.info(`[SERVICIOS_EMERGENCIA] Servicio SQL marcado como eliminado con ID: ${id}`);

        // Actualizar estado a 'eliminado' en MongoDB
        await mongo.ServicioEmergencia.updateOne(
            { idServicioEmergenciaSql: id }, 
            { $set: { estado: 'eliminado', fecha_modificacion: formattedNow } }
        );
        logger.info(`[SERVICIOS_EMERGENCIA] Servicio Mongo marcado como eliminado para ID SQL: ${id}`);
        
        res.status(200).json({ message: 'Servicio de emergencia marcado como eliminado exitosamente.' });
    } catch (error) {
        logger.error('Error al eliminar el servicio de emergencia:', error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar el servicio de emergencia.' });
    }
};

module.exports = serviciosEmergenciaCtl;
