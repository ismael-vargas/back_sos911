// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (ORM) - Necesario para relaciones
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Se mantiene por consistencia

const contactosClientesCtl = {};

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

// 1. CREAR UN NUEVO CONTACTO DE CLIENTE
contactosClientesCtl.createClientContact = async (req, res) => {
    const logger = getLogger(req);
    // Usamos clienteId, contactosEmergenciaId y notificacionId para consistencia con la DB
    const { clienteId, contactosEmergenciaId, notificacioneId, estado } = req.body; 
    logger.info(`[CONTACTOS_CLIENTES] Solicitud de creación: clienteId=${clienteId}, contactosEmergenciaId=${contactosEmergenciaId}, notificacionId=${notificacioneId}`);

    // Validar campos obligatorios
    if (!clienteId || !contactosEmergenciaId || !notificacioneId) {
        logger.warn('[CONTACTOS_CLIENTES] Creación fallida: campos obligatorios faltantes.');
        return res.status(400).json({ message: 'Los campos clienteId, contactosEmergenciaId y notificacionId son requeridos.' });
    }

    try {
        // Verificar si el cliente existe en SQL
        const [existingClienteSQL] = await sql.promise().query("SELECT id FROM clientes WHERE id = ? AND estado = 'activo'", [clienteId]);
        if (existingClienteSQL.length === 0) {
            logger.warn(`[CONTACTOS_CLIENTES] Cliente no encontrado o inactivo con ID: ${clienteId}.`);
            return res.status(404).json({ error: 'Cliente no encontrado o inactivo.' });
        }

        // Verificar si el contacto de emergencia existe en SQL
        const [existingContactoEmergenciaSQL] = await sql.promise().query("SELECT id FROM contactos_emergencias WHERE id = ? AND estado = 'activo'", [contactosEmergenciaId]);
        if (existingContactoEmergenciaSQL.length === 0) {
            logger.warn(`[CONTACTOS_CLIENTES] Contacto de emergencia no encontrado o inactivo con ID: ${contactosEmergenciaId}.`);
            return res.status(404).json({ error: 'Contacto de emergencia no encontrado o inactivo.' });
        }

        // Verificar si la notificación existe en SQL
        const [existingNotificacionSQL] = await sql.promise().query(
            "SELECT id FROM notificaciones WHERE id = ? AND estado != 'eliminado'", 
            [notificacioneId]
        );
        if (existingNotificacionSQL.length === 0) {
            logger.warn(`[CONTACTOS_CLIENTES] Notificación no encontrada o eliminada con ID: ${notificacioneId}.`);
            return res.status(404).json({ error: 'Notificación no encontrada o eliminada.' });
        }

        // Verificar si la relación ya existe
        const [existingRelationSQL] = await sql.promise().query(
            "SELECT id FROM contactos_clientes WHERE clienteId = ? AND contactosEmergenciaId = ? AND notificacioneId = ? AND estado = 'activo'",
            [clienteId, contactosEmergenciaId, notificacioneId]
        );
        if (existingRelationSQL.length > 0) {
            logger.warn('[CONTACTOS_CLIENTES] La relación de contacto de cliente ya está registrada.');
            return res.status(409).json({ message: 'La relación de contacto de cliente ya está registrada.' });
        }

        // Crear la nueva relación usando SQL directo
        const [resultadoSQL] = await sql.promise().query(
            "INSERT INTO contactos_clientes (clienteId, contactosEmergenciaId, notificacioneId, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [clienteId, contactosEmergenciaId, notificacioneId, estado || 'activo']
        );
        const newContactClientId = resultadoSQL.insertId;
        logger.info(`[CONTACTOS_CLIENTES] Contacto de cliente creado exitosamente con ID: ${newContactClientId}.`);

        // Obtener la relación recién creada para la respuesta
        const [createdRelationSQL] = await sql.promise().query(
            `SELECT 
                cc.id, 
                cc.clienteId, 
                cc.contactosEmergenciaId, 
                cc.notificacioneId, 
                cc.estado, 
                cc.fecha_creacion, 
                cc.fecha_modificacion,
                c.nombre AS cliente_nombre,
                ce.nombre AS contacto_emergencia_nombre,
                n.estado AS notificacion_estado
            FROM 
                contactos_clientes cc
            JOIN 
                clientes c ON cc.clienteId = c.id
            JOIN
                contactos_emergencias ce ON cc.contactosEmergenciaId = ce.id
            JOIN
                notificaciones n ON cc.notificacioneId = n.id
            WHERE 
                cc.id = ?`, 
            [newContactClientId]
        );
        const createdRelation = createdRelationSQL[0];

        res.status(201).json({
            message: 'Contacto de cliente registrado exitosamente.',
            contactoCliente: {
                id: createdRelation.id,
                clienteId: createdRelation.clienteId,
                contactosEmergenciaId: createdRelation.contactosEmergenciaId,
                notificacionId: createdRelation.notificacionId,
                estado: createdRelation.estado,
                fecha_creacion: createdRelation.fecha_creacion,
                fecha_modificacion: createdRelation.fecha_modificacion,
                cliente_info: {
                    nombre: safeDecrypt(createdRelation.cliente_nombre)
                },
                contacto_emergencia_info: {
                    nombre: safeDecrypt(createdRelation.contacto_emergencia_nombre)
                },
                notificacion_info: {
                    estado: createdRelation.notificacion_estado
                }
            }
        });
    } catch (error) {
        console.error(`[CONTACTOS_CLIENTES] Error al crear el contacto de cliente: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear el contacto de cliente.' });
    }
};

// 2. OBTENER TODOS LOS CONTACTOS DE CLIENTES
contactosClientesCtl.getAllClientContacts = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Para manejar borrado lógico
    logger.info(`[CONTACTOS_CLIENTES] Solicitud de obtención de todos los contactos de clientes (incluirEliminados: ${incluirEliminados})`);

    try {
        // Se usa la conexión 'sql' para una consulta directa
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE cc.estado = 'activo'";
        // Unir con clientes, contactos_emergencias y notificaciones
        const [relationsSQL] = await sql.promise().query(
            `SELECT 
                cc.id, 
                cc.clienteId, 
                cc.contactosEmergenciaId, 
                cc.notificacioneId, 
                cc.estado, 
                cc.fecha_creacion, 
                cc.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo,
                ce.nombre AS contacto_emergencia_nombre,
                ce.telefono AS contacto_emergencia_telefono,
                n.estado AS notificacion_estado
            FROM 
                contactos_clientes cc
            JOIN 
                clientes c ON cc.clienteId = c.id
            JOIN
                contactos_emergencias ce ON cc.contactosEmergenciaId = ce.id
            JOIN
                notificaciones n ON cc.notificacioneId = n.id
            ${estadoQuery}
            ORDER BY 
                cc.fecha_creacion DESC`
        );
        
        const relationsCompletas = relationsSQL.map(relSQL => ({
            id: relSQL.id,
            clienteId: relSQL.clienteId,
            contactosEmergenciaId: relSQL.contactosEmergenciaId,
            notificacionId: relSQL.notificacionId,
            estado: relSQL.estado,
            fecha_creacion: relSQL.fecha_creacion,
            fecha_modificacion: relSQL.fecha_modificacion,
            cliente_info: {
                nombre: safeDecrypt(relSQL.cliente_nombre),
                correo_electronico: safeDecrypt(relSQL.cliente_correo)
            },
            contacto_emergencia_info: {
                nombre: safeDecrypt(relSQL.contacto_emergencia_nombre),
                telefono: safeDecrypt(relSQL.contacto_emergencia_telefono)
            },
            notificacion_info: {
                estado: relSQL.notificacion_estado
            }
        }));

        logger.info(`[CONTACTOS_CLIENTES] Se devolvieron ${relationsCompletas.length} relaciones de contactos de clientes.`);
        res.status(200).json(relationsCompletas);
    } catch (error) {
        console.error('Error al obtener los contactos de clientes:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener los contactos de clientes.' });
    }
};

// 3. OBTENER UN CONTACTO DE CLIENTE POR ID
contactosClientesCtl.getClientContactById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[CONTACTOS_CLIENTES] Solicitud de contacto de cliente por ID: ${id}`);

    try {
        // Usar SQL directo para obtener la relación por ID
        const [relationSQL] = await sql.promise().query(
            `SELECT 
                cc.id, 
                cc.clienteId, 
                cc.contactosEmergenciaId, 
                cc.notificacioneId, 
                cc.estado, 
                cc.fecha_creacion, 
                cc.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo,
                ce.nombre AS contacto_emergencia_nombre,
                ce.telefono AS contacto_emergencia_telefono,
                n.estado AS notificacion_estado
            FROM 
                contactos_clientes cc
            JOIN 
                clientes c ON cc.clienteId = c.id
            JOIN
                contactos_emergencias ce ON cc.contactosEmergenciaId = ce.id
            JOIN
                notificaciones n ON cc.notificacioneId = n.id
            WHERE 
                cc.id = ? AND cc.estado = 'activo'`, 
            [id]
        );
        
        if (relationSQL.length === 0) {
            logger.warn(`[CONTACTOS_CLIENTES] Contacto de cliente no encontrado o inactivo con ID: ${id}.`);
            return res.status(404).json({ error: 'Contacto de cliente no encontrado o inactivo.' });
        }
        
        const relation = relationSQL[0];
        logger.info(`[CONTACTOS_CLIENTES] Contacto de cliente encontrado con ID: ${id}.`);

        res.status(200).json({
            id: relation.id,
            clienteId: relation.clienteId,
            contactosEmergenciaId: relation.contactosEmergenciaId,
            notificacionId: relation.notificacionId,
            estado: relation.estado,
            fecha_creacion: relation.fecha_creacion,
            fecha_modificacion: relation.fecha_modificacion,
            cliente_info: {
                nombre: safeDecrypt(relation.cliente_nombre),
                correo_electronico: safeDecrypt(relation.cliente_correo)
            },
            contacto_emergencia_info: {
                nombre: safeDecrypt(relation.contacto_emergencia_nombre),
                telefono: safeDecrypt(relation.contacto_emergencia_telefono)
            },
            notificacion_info: {
                estado: relation.notificacion_estado
            }
        });
    } catch (error) {
        console.error('Error al obtener el contacto de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener el contacto de cliente.' });
    }
};

// 4. ACTUALIZAR UN CONTACTO DE CLIENTE
contactosClientesCtl.updateClientContact = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { estado } = req.body; // Solo permitimos actualizar el estado de la relación
    logger.info(`[CONTACTOS_CLIENTES] Solicitud de actualización de contacto de cliente con ID: ${id}`);

    try {
        // Validar campos a actualizar
        if (estado === undefined) {
            logger.warn(`[CONTACTOS_CLIENTES] No se proporcionaron campos para actualizar la relación con ID: ${id}.`);
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar (solo se permite "estado").' });
        }

        // Verificar si la relación existe y está activa
        const [existingRelationSQL] = await sql.promise().query("SELECT id FROM contactos_clientes WHERE id = ? AND estado = 'activo'", [id]);
        if (existingRelationSQL.length === 0) {
            logger.warn(`[CONTACTOS_CLIENTES] Contacto de cliente no encontrado o inactivo para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Contacto de cliente no encontrado o inactivo para actualizar.' });
        }
        
        // Actualizar estado usando SQL directo
        const [resultadoSQLUpdate] = await sql.promise().query(
            "UPDATE contactos_clientes SET estado = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?", 
            [estado, id]
        );
        
        if (resultadoSQLUpdate.affectedRows === 0) {
            logger.warn(`[CONTACTOS_CLIENTES] No se pudo actualizar la relación de contacto de cliente SQL con ID: ${id}.`);
        } else {
            logger.info(`[CONTACTOS_CLIENTES] Relación de contacto de cliente SQL actualizada con ID: ${id}`);
        }
        
        // Obtener la relación actualizada para la respuesta
        const [updatedRelationSQL] = await sql.promise().query(
            `SELECT 
                cc.id, 
                cc.clienteId, 
                cc.contactosEmergenciaId, 
                cc.notificacioneId, 
                cc.estado, 
                cc.fecha_creacion, 
                cc.fecha_modificacion,
                c.nombre AS cliente_nombre,
                ce.nombre AS contacto_emergencia_nombre,
                n.estado AS notificacion_estado
            FROM 
                contactos_clientes cc
            JOIN 
                clientes c ON cc.clienteId = c.id
            JOIN
                contactos_emergencias ce ON cc.contactosEmergenciaId = ce.id
            JOIN
                notificaciones n ON cc.notificacioneId = n.id
            WHERE 
                cc.id = ?`, 
            [id]
        );
        const updatedRelation = updatedRelationSQL[0];

        res.status(200).json({ 
            message: 'Contacto de cliente actualizado correctamente.',
            contactoCliente: {
                id: updatedRelation.id,
                clienteId: updatedRelation.clienteId,
                contactosEmergenciaId: updatedRelation.contactosEmergenciaId,
                notificacionId: updatedRelation.notificacionId,
                estado: updatedRelation.estado,
                fecha_creacion: updatedRelation.fecha_creacion,
                fecha_modificacion: updatedRelation.fecha_modificacion,
                cliente_info: {
                    nombre: safeDecrypt(updatedRelation.cliente_nombre),
                    correo_electronico: safeDecrypt(updatedRelation.cliente_correo)
                },
                contacto_emergencia_info: {
                    nombre: safeDecrypt(updatedRelation.contacto_emergencia_nombre),
                    telefono: safeDecrypt(updatedRelation.contacto_emergencia_telefono)
                },
                notificacion_info: {
                    estado: updatedRelation.notificacion_estado
                }
            }
        });

    } catch (error) {
        console.error('Error al actualizar la relación de contacto de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la relación de contacto de cliente.' });
    }
};

// 5. ELIMINAR UN CONTACTO DE CLIENTE (Borrado Lógico)
contactosClientesCtl.deleteClientContact = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[CONTACTOS_CLIENTES] Solicitud de eliminación lógica de contacto de cliente con ID: ${id}`);

    try {
        // Verificar si la relación existe y está activa
        const [existingRelationSQL] = await sql.promise().query("SELECT id FROM contactos_clientes WHERE id = ? AND estado = 'activo'", [id]);
        if (existingRelationSQL.length === 0) {
            logger.warn(`[CONTACTOS_CLIENTES] Contacto de cliente no encontrado o ya eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Contacto de cliente no encontrado o ya estaba eliminado.' });
        }

        // Marcar como eliminado en SQL directo
        const [resultadoSQL] = await sql.promise().query("UPDATE contactos_clientes SET estado = 'eliminado', fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?", [id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.error(`[CONTACTOS_CLIENTES] No se pudo marcar como eliminado la relación de contacto de cliente con ID: ${id}.`);
            return res.status(500).json({ error: 'No se pudo eliminar la relación de contacto de cliente.' });
        }

        logger.info(`[CONTACTOS_CLIENTES] Relación de contacto de cliente marcada como eliminada: id=${id}.`);
        res.status(200).json({ message: 'Relación de contacto de cliente marcada como eliminada correctamente.' });
    } catch (error) {
        console.error('Error al borrar el contacto de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al borrar el contacto de cliente.' });
    }
};

module.exports = contactosClientesCtl;
