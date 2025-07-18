// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL) - Necesario para relaciones
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Se mantiene por consistencia

const notificacionesCtl = {};

// --- Utilidad para Descifrado Seguro ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos:', error.message);
        return '';
    }
}

// Utilidad para obtener el logger
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// 1. CREAR UNA NUEVA NOTIFICACIÓN
notificacionesCtl.createNotification = async (req, res) => {
    const logger = getLogger(req);
    // Usamos presionesBotonPanicoId (plural) y clienteId (camelCase) para consistencia con la DB
    const { presionesBotonPanicoId, clienteId, recibido, respuesta, estado } = req.body; 
    logger.info(`[NOTIFICACIONES] Solicitud de creación: presionesBotonPanicoId=${presionesBotonPanicoId}, clienteId=${clienteId}`);

    // Validar campos obligatorios
    if (!presionesBotonPanicoId || !clienteId) {
        logger.warn('[NOTIFICACIONES] Creación fallida: campos obligatorios faltantes.');
        return res.status(400).json({ message: 'Los campos presionesBotonPanicoId y clienteId son requeridos.' });
    }

    try {
        // Verificar si la presión del botón de pánico existe en SQL
        const [existingPresionSQL] = await sql.promise().query("SELECT id FROM presiones_boton_panicos WHERE id = ?", [presionesBotonPanicoId]);
        if (existingPresionSQL.length === 0) {
            logger.warn(`[NOTIFICACIONES] Presión del botón de pánico no encontrada con ID: ${presionesBotonPanicoId}.`);
            return res.status(404).json({ error: 'Presión del botón de pánico no encontrada.' });
        }

        // Verificar si el cliente existe en SQL
        const [existingClienteSQL] = await sql.promise().query("SELECT id FROM clientes WHERE id = ? AND estado = 'activo'", [clienteId]);
        if (existingClienteSQL.length === 0) {
            logger.warn(`[NOTIFICACIONES] Cliente no encontrado o inactivo con ID: ${clienteId}.`);
            return res.status(404).json({ error: 'Cliente no encontrado o inactivo.' });
        }

        // Crear la nueva notificación usando SQL directo
        const [resultadoSQL] = await sql.promise().query(
            "INSERT INTO notificaciones (presionesBotonPanicoId, clienteId, recibido, respuesta, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [presionesBotonPanicoId, clienteId, recibido || false, respuesta || false, estado || 'pendiente'] // respuesta ahora es BOOLEAN
        );
        const newNotificationId = resultadoSQL.insertId;
        logger.info(`[NOTIFICACIONES] Notificación creada exitosamente con ID: ${newNotificationId}.`);

        // Obtener la notificación recién creada para la respuesta
        const [createdNotificationSQL] = await sql.promise().query(
            `SELECT 
                n.id, 
                n.presionesBotonPanicoId,  
                n.clienteId,  
                n.recibido, 
                n.respuesta, 
                n.estado, 
                n.fecha_creacion, 
                n.fecha_modificacion,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                notificaciones n
            JOIN 
                presiones_boton_panicos pbp ON n.presionesBotonPanicoId = pbp.id 
            JOIN
                clientes c ON n.clienteId = c.id 
            WHERE 
                n.id = ?`, 
            [newNotificationId]
        );
        const createdNotification = createdNotificationSQL[0];

        res.status(201).json({
            message: 'Notificación registrada exitosamente.',
            notificacion: {
                id: createdNotification.id,
                presionesBotonPanicoId: createdNotification.presionesBotonPanicoId, 
                clienteId: createdNotification.clienteId, 
                recibido: createdNotification.recibido,
                respuesta: createdNotification.respuesta,
                estado: createdNotification.estado,
                fecha_creacion: createdNotification.fecha_creacion,
                fecha_modificacion: createdNotification.fecha_modificacion,
                presion_info: {
                    marca_tiempo: createdNotification.presion_marca_tiempo
                },
                cliente_info: {
                    nombre: safeDecrypt(createdNotification.cliente_nombre),
                    correo_electronico: safeDecrypt(createdNotification.cliente_correo)
                }
            }
        });
    } catch (error) {
        console.error(`[NOTIFICACIONES] Error al crear la notificación: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear la notificación.' });
    }
};

// 2. OBTENER TODAS LAS NOTIFICACIONES
notificacionesCtl.getAllNotifications = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Para manejar borrado lógico
    logger.info(`[NOTIFICACIONES] Solicitud de obtención de todas las notificaciones (incluirEliminados: ${incluirEliminados})`);

    try {
        // Se usa la conexión 'sql' para una consulta directa
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE n.estado != 'eliminado'"; // Las notificaciones pueden tener estados como 'pendiente', 'enviada', 'recibida', 'resuelta'
        // Unir con presiones_boton_panicos y clientes
        const [notificacionesSQL] = await sql.promise().query(
            `SELECT 
                n.id, 
                n.presionesBotonPanicoId,  
                n.clienteId,  
                n.recibido, 
                n.respuesta, 
                n.estado, 
                n.fecha_creacion, 
                n.fecha_modificacion,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                notificaciones n
            JOIN 
                presiones_boton_panicos pbp ON n.presionesBotonPanicoId = pbp.id 
            JOIN
                clientes c ON n.clienteId = c.id 
            ${estadoQuery}
            ORDER BY 
                n.fecha_creacion DESC`
        );
        
        const notificacionesCompletas = notificacionesSQL.map(notifSQL => ({
            id: notifSQL.id,
            presionesBotonPanicoId: notifSQL.presionesBotonPanicoId, 
            clienteId: notifSQL.clienteId, 
            recibido: notifSQL.recibido,
            respuesta: notifSQL.respuesta,
            estado: notifSQL.estado,
            fecha_creacion: notifSQL.fecha_creacion,
            fecha_modificacion: notifSQL.fecha_modificacion,
            presion_info: {
                marca_tiempo: notifSQL.presion_marca_tiempo
            },
            cliente_info: {
                nombre: safeDecrypt(notifSQL.cliente_nombre),
                correo_electronico: safeDecrypt(notifSQL.cliente_correo)
            }
        }));

        logger.info(`[NOTIFICACIONES] Se devolvieron ${notificacionesCompletas.length} notificaciones.`);
        res.status(200).json(notificacionesCompletas);
    } catch (error) {
        console.error('Error al obtener las notificaciones:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener las notificaciones.' });
    }
};

// 3. OBTENER UNA NOTIFICACIÓN POR ID
notificacionesCtl.getNotificationById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[NOTIFICACIONES] Solicitud de obtención de notificación por ID: ${id}`);

    try {
        // Usar SQL directo para obtener la notificación por ID
        const [notificacionSQL] = await sql.promise().query(
            `SELECT 
                n.id, 
                n.presionesBotonPanicoId,  
                n.clienteId,  
                n.recibido, 
                n.respuesta, 
                n.estado, 
                n.fecha_creacion, 
                n.fecha_modificacion,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                notificaciones n
            JOIN 
                presiones_boton_panicos pbp ON n.presionesBotonPanicoId = pbp.id 
            JOIN
                clientes c ON n.clienteId = c.id 
            WHERE 
                n.id = ? AND n.estado != 'eliminado'`, 
            [id]
        );
        
        if (notificacionSQL.length === 0) {
            logger.warn(`[NOTIFICACIONES] Notificación no encontrada o eliminada con ID: ${id}.`);
            return res.status(404).json({ error: 'Notificación no encontrada o eliminada.' });
        }
        
        const notificacion = notificacionSQL[0];
        logger.info(`[NOTIFICACIONES] Notificación encontrada con ID: ${id}.`);

        res.status(200).json({
            id: notificacion.id,
            presionesBotonPanicoId: notificacion.presionesBotonPanicoId, 
            clienteId: notificacion.clienteId, 
            recibido: notificacion.recibido,
            respuesta: notificacion.respuesta,
            estado: notificacion.estado,
            fecha_creacion: notificacion.fecha_creacion,
            fecha_modificacion: notificacion.fecha_modificacion,
            presion_info: {
                marca_tiempo: notificacion.presion_marca_tiempo
            },
            cliente_info: {
                nombre: safeDecrypt(notificacion.cliente_nombre),
                correo_electronico: safeDecrypt(notificacion.cliente_correo)
            }
        });
    } catch (error) {
        console.error('Error al obtener la notificación:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener la notificación.' });
    }
};

// 4. ACTUALIZAR UNA NOTIFICACIÓN
notificacionesCtl.updateNotification = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { recibido, respuesta, estado } = req.body; 
    logger.info(`[NOTIFICACIONES] Solicitud de actualización de notificación con ID: ${id}`);

    try {
        // Verificar si la notificación existe y no está eliminada
        const [existingNotificationSQL] = await sql.promise().query("SELECT * FROM notificaciones WHERE id = ? AND estado != 'eliminado'", [id]);
        if (existingNotificationSQL.length === 0) {
            logger.warn(`[NOTIFICACIONES] Notificación no encontrada o eliminada para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Notificación no encontrada o eliminada para actualizar.' });
        }
        
        // Preparar datos para SQL
        const camposSQL = [];
        const valoresSQL = [];
        
        if (recibido !== undefined) {
            camposSQL.push('recibido = ?');
            valoresSQL.push(recibido);
        }
        if (respuesta !== undefined) {
            camposSQL.push('respuesta = ?');
            valoresSQL.push(respuesta);
        }
        if (estado !== undefined) {
            camposSQL.push('estado = ?');
            valoresSQL.push(estado);
        }

        if (camposSQL.length === 0) {
            logger.warn(`[NOTIFICACIONES] No se proporcionaron campos para actualizar la notificación con ID: ${id}.`);
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        valoresSQL.push(id); // Para el WHERE
        const consultaSQL = `UPDATE notificaciones SET ${camposSQL.join(', ')}, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?`;
        const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, valoresSQL);
        
        if (resultadoSQLUpdate.affectedRows === 0) {
            logger.warn(`[NOTIFICACIONES] No se pudo actualizar la notificación SQL con ID: ${id}.`);
        } else {
            logger.info(`[NOTIFICACIONES] Notificación SQL actualizada con ID: ${id}`);
        }
        
        // Obtener la notificación actualizada para la respuesta
        const [updatedNotificationSQL] = await sql.promise().query(
            `SELECT 
                n.id, 
                n.presionesBotonPanicoId,  
                n.clienteId,  
                n.recibido, 
                n.respuesta, 
                n.estado, 
                n.fecha_creacion, 
                n.fecha_modificacion,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                notificaciones n
            JOIN 
                presiones_boton_panicos pbp ON n.presionesBotonPanicoId = pbp.id 
            JOIN
                clientes c ON n.clienteId = c.id 
            WHERE 
                n.id = ?`, 
            [id]
        );
        const updatedNotification = updatedNotificationSQL[0];

        res.status(200).json({ 
            message: 'Notificación actualizada correctamente.',
            notificacion: {
                id: updatedNotification.id,
                presionesBotonPanicoId: updatedNotification.presionesBotonPanicoId, 
                clienteId: updatedNotification.clienteId, 
                recibido: updatedNotification.recibido,
                respuesta: updatedNotification.respuesta,
                estado: updatedNotification.estado,
                fecha_creacion: updatedNotification.fecha_creacion,
                fecha_modificacion: updatedNotification.fecha_modificacion,
                presion_info: {
                    marca_tiempo: updatedNotification.presion_marca_tiempo
                },
                cliente_info: {
                    nombre: safeDecrypt(updatedNotification.cliente_nombre),
                    correo_electronico: safeDecrypt(updatedNotification.cliente_correo)
                }
            }
        });

    } catch (error) {
        console.error('Error al actualizar la notificación:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la notificación.' });
    }
};

// 5. ELIMINAR UNA NOTIFICACIÓN (Borrado Lógico)
notificacionesCtl.deleteNotification = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[NOTIFICACIONES] Solicitud de eliminación lógica de notificación con ID: ${id}`);

    try {
        // Verificar si la notificación existe y no está eliminada
        const [existingNotificationSQL] = await sql.promise().query("SELECT id FROM notificaciones WHERE id = ? AND estado != 'eliminado'", [id]);
        if (existingNotificationSQL.length === 0) {
            logger.warn(`[NOTIFICACIONES] Notificación no encontrada o ya eliminada con ID: ${id}`);
            return res.status(404).json({ error: 'Notificación no encontrada o ya estaba eliminada.' });
        }

        // Marcar como eliminado en SQL directo
        const [resultadoSQL] = await sql.promise().query("UPDATE notificaciones SET estado = 'eliminado', fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?", [id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.error(`[NOTIFICACIONES] No se pudo marcar como eliminado la notificación con ID: ${id}.`);
            return res.status(500).json({ error: 'No se pudo eliminar la notificación.' });
        }

        logger.info(`[NOTIFICACIONES] Notificación marcada como eliminada: id=${id}.`);
        res.status(200).json({ message: 'Notificación marcada como eliminada correctamente.' });
    } catch (error) {
        console.error('Error al borrar la notificación:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al borrar la notificación.' });
    }
};

module.exports = notificacionesCtl;