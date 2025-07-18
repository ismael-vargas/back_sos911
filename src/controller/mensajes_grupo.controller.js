// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL) - Para obtener info de cliente/grupo si es necesario
const sql = require('../Database/dataBase.sql'); // MySQL directo - Para obtener info de cliente/grupo si es necesario
const mongo = require('../Database/dataBase.mongo'); // Para Mongoose (MongoDB)

const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Se mantiene por consistencia

const mensajesGrupoCtl = {};

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

// 1. CREAR UN NUEVO MENSAJE DE GRUPO (POST /mensajes_grupo/crear)
mensajesGrupoCtl.createGroupMessage = async (req, res) => {
    const logger = getLogger(req);
    const { grupoId, clienteId, mensaje, tipo_mensaje } = req.body; // Añadido tipo_mensaje

    logger.info(`[MENSAJES_GRUPO] Solicitud de creación de mensaje: grupoId=${grupoId}, clienteId=${clienteId}`);

    // Validar campos obligatorios
    if (!grupoId || !clienteId || !mensaje) {
        logger.warn('[MENSAJES_GRUPO] Creación fallida: campos obligatorios faltantes.');
        return res.status(400).json({ message: 'Los campos grupoId, clienteId y mensaje son requeridos.' });
    }

    try {
        // Opcional: Verificar si el grupo y el cliente existen en SQL antes de crear el mensaje
        // Esto asegura la integridad referencial si los IDs de SQL son importantes.
        const [grupoSQL] = await sql.promise().query("SELECT id FROM grupos WHERE id = ? AND estado = 'activo'", [grupoId]);
        if (grupoSQL.length === 0) {
            logger.warn(`[MENSAJES_GRUPO] Grupo no encontrado o inactivo con ID: ${grupoId}.`);
            return res.status(404).json({ error: 'Grupo no encontrado o inactivo.' });
        }
        const [clienteSQL] = await sql.promise().query("SELECT id FROM clientes WHERE id = ? AND estado = 'activo'", [clienteId]);
        if (clienteSQL.length === 0) {
            logger.warn(`[MENSAJES_GRUPO] Cliente no encontrado o inactivo con ID: ${clienteId}.`);
            return res.status(404).json({ error: 'Cliente no encontrado o inactivo.' });
        }

        // 1. Crear el nuevo mensaje en MongoDB
        const nuevoMensajeMongo = {
            grupoId,
            clienteId,
            mensaje,
            fecha_envio: new Date(), // Se genera en el servidor
            estado: 'activo', // Estado por defecto
            tipo_mensaje: tipo_mensaje || 'texto' // Guardar tipo de mensaje en Mongo también
        };
        const mensajeGuardadoMongo = await mongo.MensajeGrupo.create(nuevoMensajeMongo);
        logger.info(`[MENSAJES_GRUPO] Mensaje creado exitosamente en Mongo: _id=${mensajeGuardadoMongo._id}`);

        // 2. Guardar metadatos del mensaje en la tabla SQL 'mensajes_grupos' (CORREGIDO: plural)
        // Usamos el _id de MongoDB como mongoMessageId en SQL
        await sql.promise().query(
            "INSERT INTO mensajes_grupos (grupoId, clienteId, mongoMessageId, tipo_mensaje, fecha_envio, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [
                grupoId,
                clienteId,
                mensajeGuardadoMongo._id.toString(), // Convertir ObjectId a String
                tipo_mensaje || 'texto',
                new Date(), // Usar la misma fecha de envío para SQL y Mongo si es posible
                'activo'
            ]
        );
        logger.info(`[MENSAJES_GRUPO] Metadatos del mensaje guardados en SQL para Mongo _id: ${mensajeGuardadoMongo._id}`);

        // Opcional: Actualizar metadatos en la tabla 'grupos' de SQL (ej. ultimo_mensaje_fecha, total_mensajes)
        // Esto asume que tienes las columnas 'ultimo_mensaje_fecha' y 'total_mensajes' en tu tabla 'grupos'
        await sql.promise().query(
            "UPDATE grupos SET ultimo_mensaje_fecha = ?, total_mensajes = total_mensajes + 1 WHERE id = ?",
            [new Date(), grupoId] 
        );
        logger.info(`[MENSAJES_GRUPO] Metadatos del grupo ${grupoId} actualizados en SQL.`);


        res.status(201).json({
            message: 'Mensaje creado exitosamente.',
            mensaje: {
                id: mensajeGuardadoMongo._id, // Usar el _id de Mongo como ID principal para el frontend
                grupoId: mensajeGuardadoMongo.grupoId,
                clienteId: mensajeGuardadoMongo.clienteId,
                mensaje: mensajeGuardadoMongo.mensaje,
                fecha_envio: mensajeGuardadoMongo.fecha_envio,
                estado: mensajeGuardadoMongo.estado,
                tipo_mensaje: mensajeGuardadoMongo.tipo_mensaje
            }
        });
    } catch (error) {
        console.error(`[MENSAJES_GRUPO] Error al crear el mensaje: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear el mensaje.' });
    }
};

// 2. OBTENER TODOS LOS MENSAJES DE UN GRUPO (GET /mensajes_grupo/listar/por-grupo/:grupoId)
mensajesGrupoCtl.getMessagesByGroup = async (req, res) => {
    const logger = getLogger(req);
    const { grupoId } = req.params; // Cambiado a camelCase
    logger.info(`[MENSAJES_GRUPO] Solicitud de mensajes para grupoId: ${grupoId}`);

    try {
        // Obtener mensajes de MongoDB para el grupo especificado
        // Se ordena por fecha_envio para obtener el historial en orden cronológico
        const mensajesMongo = await mongo.MensajeGrupo.find({ grupoId, estado: 'activo' }).sort({ fecha_envio: 1 });
        
        // Si no hay mensajes, devolver vacío
        if (mensajesMongo.length === 0) {
            logger.info(`[MENSAJES_GRUPO] No se encontraron mensajes activos para grupoId: ${grupoId}.`);
            return res.status(200).json([]);
        }

        // Obtener información de clientes para descifrar nombres/correos
        const clienteIds = [...new Set(mensajesMongo.map(m => m.clienteId))];
        let clientesMap = new Map();
        if (clienteIds.length > 0) { // Asegurarse de que el array de IDs no esté vacío antes de la consulta IN
            const [clientesSQL] = await sql.promise().query(`SELECT id, nombre, correo_electronico FROM clientes WHERE id IN (${clienteIds.join(',')})`);
            clientesMap = new Map(clientesSQL.map(c => [c.id, { nombre: safeDecrypt(c.nombre), correo_electronico: safeDecrypt(c.correo_electronico) }]));
        }

        const mensajesCompletos = mensajesMongo.map(msg => ({
            id: msg._id, // Usar el _id de Mongo como ID principal para el frontend
            grupoId: msg.grupoId,
            clienteId: msg.clienteId,
            mensaje: msg.mensaje,
            fecha_envio: msg.fecha_envio,
            estado: msg.estado,
            tipo_mensaje: msg.tipo_mensaje,
            // Añadir información del cliente si se encontró
            cliente_info: clientesMap.get(msg.clienteId) || { nombre: 'Desconocido', correo_electronico: 'Desconocido' }
        }));

        logger.info(`[MENSAJES_GRUPO] Se devolvieron ${mensajesCompletos.length} mensajes para grupoId: ${grupoId}.`);
        res.status(200).json(mensajesCompletos);
    } catch (error) {
        console.error(`[MENSAJES_GRUPO] Error al obtener los mensajes del grupo: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al obtener los mensajes.' });
    }
};

// 3. ACTUALIZAR UN MENSAJE EXISTENTE (PUT /mensajes_grupo/actualizar/:id)
mensajesGrupoCtl.updateGroupMessage = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params; // _id de MongoDB
    const { mensaje, estado, tipo_mensaje } = req.body; // Se permite actualizar contenido, estado y tipo
    logger.info(`[MENSAJES_GRUPO] Solicitud de actualización de mensaje con ID: ${id}`);

    if (!mensaje && estado === undefined && tipo_mensaje === undefined) {
        logger.warn('[MENSAJES_GRUPO] Actualización fallida: No se proporcionó contenido de mensaje, estado o tipo para actualizar.');
        return res.status(400).json({ message: 'Se requiere el campo "mensaje", "estado" o "tipo_mensaje" para actualizar.' });
    }

    try {
        const updateDataMongo = {};
        if (mensaje !== undefined) updateDataMongo.mensaje = mensaje;
        if (estado !== undefined) updateDataMongo.estado = estado;
        if (tipo_mensaje !== undefined) updateDataMongo.tipo_mensaje = tipo_mensaje;
        updateDataMongo.fecha_modificacion = new Date(); // Actualizar fecha de modificación en Mongo

        const resultMongo = await mongo.MensajeGrupo.updateOne(
            { _id: id, estado: 'activo' }, // Solo actualiza si está activo
            { $set: updateDataMongo }
        );

        if (resultMongo.matchedCount === 0) {
            logger.warn(`[MENSAJES_GRUPO] Mensaje no encontrado o inactivo para actualizar en Mongo con ID: ${id}.`);
            return res.status(404).json({ error: 'Mensaje no encontrado o inactivo.' });
        }
        logger.info(`[MENSAJES_GRUPO] Mensaje actualizado exitosamente en Mongo: ID=${id}`);

        // Opcional: Actualizar el estado en el registro de metadatos SQL si el estado del mensaje cambió
        if (estado !== undefined) {
            await sql.promise().query(
                "UPDATE mensajes_grupos SET estado = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE mongoMessageId = ?", // CORREGIDO: plural
                [estado, id]
            );
            logger.info(`[MENSAJES_GRUPO] Estado del metadato del mensaje en SQL actualizado para Mongo _id: ${id}.`);
        }

        // Obtener el mensaje actualizado para la respuesta
        const updatedMessage = await mongo.MensajeGrupo.findById(id);

        res.status(200).json({
            message: 'Mensaje actualizado correctamente.',
            mensaje: {
                id: updatedMessage._id,
                grupoId: updatedMessage.grupoId,
                clienteId: updatedMessage.clienteId,
                mensaje: updatedMessage.mensaje,
                fecha_envio: updatedMessage.fecha_envio,
                estado: updatedMessage.estado,
                tipo_mensaje: updatedMessage.tipo_mensaje,
                fecha_modificacion: updatedMessage.fecha_modificacion
            }
        });
    } catch (error) {
        console.error(`[MENSAJES_GRUPO] Error al actualizar el mensaje: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el mensaje.' });
    }
};

// 4. ELIMINAR UN MENSAJE (Borrado Lógico) (DELETE /mensajes_grupo/eliminar/:id)
mensajesGrupoCtl.deleteGroupMessage = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params; // _id de MongoDB
    logger.info(`[MENSAJES_GRUPO] Solicitud de eliminación lógica de mensaje con ID: ${id}`);

    try {
        // Marcar como eliminado en MongoDB
        const resultMongo = await mongo.MensajeGrupo.updateOne(
            { _id: id, estado: 'activo' }, // Solo marca como eliminado si está activo
            { $set: { estado: 'eliminado', fecha_modificacion: new Date() } }
        );

        if (resultMongo.matchedCount === 0) {
            logger.warn(`[MENSAJES_GRUPO] Mensaje no encontrado o ya eliminado en Mongo con ID: ${id}.`);
            return res.status(404).json({ error: 'Mensaje no encontrado o ya estaba eliminado.' });
        }
        logger.info(`[MENSAJES_GRUPO] Mensaje marcado como eliminado en Mongo: ID=${id}`);

        // Marcar como eliminado en el registro de metadatos SQL
        const [resultadoSQL] = await sql.promise().query(
            "UPDATE mensajes_grupos SET estado = 'eliminado', fecha_modificacion = CURRENT_TIMESTAMP WHERE mongoMessageId = ?", // CORREGIDO: plural
            [id]
        );
        
        if (resultadoSQL.affectedRows === 0) {
            logger.warn(`[MENSAJES_GRUPO] Metadato de mensaje en SQL no encontrado para eliminar para Mongo _id: ${id}.`);
            // Esto no es un error crítico si el mensaje ya se eliminó en Mongo, pero se loguea.
        }
        logger.info(`[MENSAJES_GRUPO] Metadato de mensaje en SQL marcado como eliminado para Mongo _id: ${id}.`);

        res.status(200).json({ message: 'Mensaje marcado como eliminado correctamente.' });
    } catch (error) {
        console.error(`[MENSAJES_GRUPO] Error al eliminar el mensaje: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar el mensaje.' });
    }
};

module.exports = mensajesGrupoCtl;
