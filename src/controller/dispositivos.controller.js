// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL) - Necesario para la relación y el modelo
const sql = require('../Database/dataBase.sql'); // Para MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

const dispositivosCtl = {};

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

// 1. CREAR UN NUEVO DISPOSITIVO
dispositivosCtl.createDevice = async (req, res) => {
    const logger = getLogger(req);
    const { clienteId, token_dispositivo, tipo_dispositivo, modelo_dispositivo, estado } = req.body;

    logger.info(`[DISPOSITIVO] Solicitud de creación de dispositivo para clienteId: ${clienteId}`);

    try {
        // Validar campos obligatorios
        if (!clienteId || !token_dispositivo || !tipo_dispositivo || !modelo_dispositivo) {
            logger.warn('[DISPOSITIVO] Creación fallida: campos obligatorios faltantes.');
            return res.status(400).json({ message: 'Todos los campos obligatorios son requeridos (clienteId, token_dispositivo, tipo_dispositivo, modelo_dispositivo).' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Cifrar los campos sensibles
        const tokenCifrado = cifrarDato(token_dispositivo);
        const tipoCifrado = cifrarDato(tipo_dispositivo);
        const modeloCifrado = cifrarDato(modelo_dispositivo);

        // Verificar si el dispositivo ya existe para ese cliente y token cifrado (usando SQL directo)
        const [existingDispositivoSQL] = await sql.promise().query(
            "SELECT id FROM dispositivos WHERE clienteId = ? AND token_dispositivo = ?",
            [clienteId, tokenCifrado]
        );

        if (existingDispositivoSQL.length > 0) {
            logger.warn(`[DISPOSITIVO] El dispositivo ya está registrado para clienteId ${clienteId} con este token.`);
            return res.status(409).json({ message: 'El dispositivo ya está registrado para este cliente.' });
        }

        // Si no existe, crear un nuevo dispositivo usando ORM (orm.dispositivos.create())
        const nuevoDispositivo = {
            clienteId: clienteId,
            token_dispositivo: tokenCifrado,
            tipo_dispositivo: tipoCifrado,
            modelo_dispositivo: modeloCifrado,
            estado: estado || 'activo',
            fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
            // fecha_modificacion NO se incluye en la creación, se actualizará en modificaciones
        };
        const dispositivoGuardado = await orm.dispositivos.create(nuevoDispositivo);
        const newDeviceId = dispositivoGuardado.id; // Obtener el ID insertado por ORM
        logger.info(`[DISPOSITIVO] Dispositivo creado exitosamente con ID: ${newDeviceId} para clienteId: ${clienteId}.`);

        // Obtener el dispositivo recién creado para la respuesta
        const [createdDeviceSQL] = await sql.promise().query("SELECT * FROM dispositivos WHERE id = ?", [newDeviceId]);
        const createdDevice = createdDeviceSQL[0];

        res.status(201).json({
            message: 'Dispositivo registrado exitosamente.',
            dispositivo: {
                id: createdDevice.id,
                clienteId: createdDevice.clienteId,
                token_dispositivo: safeDecrypt(createdDevice.token_dispositivo),
                tipo_dispositivo: safeDecrypt(createdDevice.tipo_dispositivo),
                modelo_dispositivo: safeDecrypt(createdDevice.modelo_dispositivo),
                estado: createdDevice.estado,
                fecha_creacion: createdDevice.fecha_creacion,
                fecha_modificacion: createdDevice.fecha_modificacion // Puede ser null si no se ha modificado
            }
        });
    } catch (error) {
        logger.error(`[DISPOSITIVO] Error al crear el dispositivo: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear el dispositivo.' });
    }
};

// 2. OBTENER TODOS LOS DISPOSITIVOS CON INFORMACIÓN DEL CLIENTE
dispositivosCtl.getAllDevices = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Añadido para consistencia
    logger.info(`[DISPOSITIVO] Solicitud de obtención de todos los dispositivos (incluirEliminados: ${incluirEliminados}).`);

    try {
        let querySQL = `SELECT 
                            d.id, 
                            d.clienteId, 
                            d.token_dispositivo, 
                            d.tipo_dispositivo, 
                            d.modelo_dispositivo, 
                            d.estado, 
                            d.fecha_creacion, 
                            d.fecha_modificacion,
                            c.nombre AS cliente_nombre,
                            c.correo_electronico AS cliente_correo,
                            c.cedula_identidad AS cliente_cedula
                        FROM 
                            dispositivos d
                        JOIN 
                            clientes c ON d.clienteId = c.id`;
        
        const params = [];
        if (!incluirEliminados) {
            querySQL += ` WHERE d.estado = 'activo'`;
        }
        querySQL += ` ORDER BY d.fecha_creacion DESC`; // Ordenar para consistencia

        const [dispositivosSQL] = await sql.promise().query(querySQL, params);

        // Descifrar los datos sensibles antes de enviar
        const dispositivosCompletos = dispositivosSQL.map(dispSQL => ({
            id: dispSQL.id,
            clienteId: dispSQL.clienteId,
            token_dispositivo: safeDecrypt(dispSQL.token_dispositivo),
            tipo_dispositivo: safeDecrypt(dispSQL.tipo_dispositivo),
            modelo_dispositivo: safeDecrypt(dispSQL.modelo_dispositivo),
            estado: dispSQL.estado,
            fecha_creacion: dispSQL.fecha_creacion,
            fecha_modificacion: dispSQL.fecha_modificacion,
            cliente_info: {
                nombre: safeDecrypt(dispSQL.cliente_nombre),
                correo_electronico: safeDecrypt(dispSQL.cliente_correo),
                cedula_identidad: safeDecrypt(dispSQL.cliente_cedula)
            }
        }));

        logger.info(`[DISPOSITIVO] Se devolvieron ${dispositivosCompletos.length} dispositivos.`);
        res.status(200).json(dispositivosCompletos);
    } catch (error) {
        logger.error('Error al obtener los dispositivos:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener los dispositivos.' });
    }
};

// 3. OBTENER UN DISPOSITIVO POR ID
dispositivosCtl.getDeviceById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[DISPOSITIVO] Solicitud de obtención de dispositivo por ID: ${id}`);

    try {
        // Usar SQL directo para obtener el dispositivo por ID
        const [dispositivoSQL] = await sql.promise().query("SELECT * FROM dispositivos WHERE id = ? AND estado = 'activo'", [id]);
        
        if (dispositivoSQL.length === 0) {
            logger.warn(`[DISPOSITIVO] Dispositivo no encontrado o inactivo con ID: ${id}`);
            return res.status(404).json({ error: 'Dispositivo no encontrado o inactivo.' });
        }
        
        const dispositivo = dispositivoSQL[0];
        logger.info(`[DISPOSITIVO] Dispositivo encontrado con ID: ${id}.`);

        res.status(200).json({
            id: dispositivo.id,
            clienteId: dispositivo.clienteId,
            token_dispositivo: safeDecrypt(dispositivo.token_dispositivo),
            tipo_dispositivo: safeDecrypt(dispositivo.tipo_dispositivo),
            modelo_dispositivo: safeDecrypt(dispositivo.modelo_dispositivo),
            estado: dispositivo.estado,
            fecha_creacion: dispositivo.fecha_creacion,
            fecha_modificacion: dispositivo.fecha_modificacion
        });
    } catch (error) {
        logger.error('Error al obtener el dispositivo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener el dispositivo.' });
    }
};

// 4. ACTUALIZAR UN DISPOSITIVO POR ID
dispositivosCtl.updateDevice = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { token_dispositivo, tipo_dispositivo, modelo_dispositivo, estado } = req.body;
    logger.info(`[DISPOSITIVO] Solicitud de actualización de dispositivo con ID: ${id}`);

    try {
        // Verificar si el dispositivo existe y está activo
        const [existingDeviceSQL] = await sql.promise().query("SELECT * FROM dispositivos WHERE id = ? AND estado = 'activo'", [id]);
        if (existingDeviceSQL.length === 0) {
            logger.warn(`[DISPOSITIVO] Dispositivo no encontrado o inactivo para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Dispositivo no encontrado o inactivo para actualizar.' });
        }
        const dispositivoExistente = existingDeviceSQL[0];

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar datos para SQL (solo los que no son undefined)
        const camposSQL = [];
        const valoresSQL = [];
        
        if (token_dispositivo !== undefined) {
            camposSQL.push('token_dispositivo = ?');
            valoresSQL.push(cifrarDato(token_dispositivo));
        }
        if (tipo_dispositivo !== undefined) {
            camposSQL.push('tipo_dispositivo = ?');
            valoresSQL.push(cifrarDato(tipo_dispositivo));
        }
        if (modelo_dispositivo !== undefined) {
            camposSQL.push('modelo_dispositivo = ?');
            valoresSQL.push(cifrarDato(modelo_dispositivo));
        }
        if (estado !== undefined) {
            camposSQL.push('estado = ?');
            valoresSQL.push(estado);
        }

        if (camposSQL.length === 0) {
            logger.warn(`[DISPOSITIVO] No se proporcionaron campos para actualizar el dispositivo con ID: ${id}.`);
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        // Siempre actualizar fecha_modificacion en SQL
        camposSQL.push('fecha_modificacion = ?');
        valoresSQL.push(formattedNow); // CAMBIO: Usar formattedNow

        valoresSQL.push(id); // Para el WHERE
        const consultaSQL = `UPDATE dispositivos SET ${camposSQL.join(', ')} WHERE id = ?`;
        const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, valoresSQL);
        
        if (resultadoSQLUpdate.affectedRows === 0) {
            logger.warn(`[DISPOSITIVO] No se pudo actualizar el dispositivo SQL con ID: ${id}.`);
        } else {
            logger.info(`[DISPOSITIVO] Dispositivo SQL actualizado con ID: ${id}`);
        }
        
        // Obtener el dispositivo actualizado para la respuesta
        const [updatedDeviceSQL] = await sql.promise().query("SELECT * FROM dispositivos WHERE id = ?", [id]);
        const updatedDevice = updatedDeviceSQL[0];

        res.status(200).json({ 
            message: 'Dispositivo actualizado correctamente.',
            dispositivo: {
                id: updatedDevice.id,
                clienteId: updatedDevice.clienteId,
                token_dispositivo: safeDecrypt(updatedDevice.token_dispositivo),
                tipo_dispositivo: safeDecrypt(updatedDevice.tipo_dispositivo),
                modelo_dispositivo: safeDecrypt(updatedDevice.modelo_dispositivo),
                estado: updatedDevice.estado,
                fecha_creacion: updatedDevice.fecha_creacion,
                fecha_modificacion: updatedDevice.fecha_modificacion
            }
        });

    } catch (error) {
        logger.error('Error al actualizar el dispositivo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el dispositivo.' });
    }
};

// 5. ELIMINAR UN DISPOSITIVO (Borrado Lógico)
dispositivosCtl.deleteDevice = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[DISPOSITIVO] Solicitud de eliminación lógica de dispositivo con ID: ${id}`);

    try {
        // Verificar si el dispositivo existe y está activo
        const [existingDeviceSQL] = await sql.promise().query("SELECT id FROM dispositivos WHERE id = ? AND estado = 'activo'", [id]);
        if (existingDeviceSQL.length === 0) {
            logger.warn(`[DISPOSITIVO] Dispositivo no encontrado o ya eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Dispositivo no encontrado o ya estaba eliminado.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado en SQL directo
        const [resultadoSQL] = await sql.promise().query("UPDATE dispositivos SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.error(`[DISPOSITIVO] No se pudo marcar como eliminado el dispositivo con ID: ${id}.`);
            return res.status(500).json({ error: 'No se pudo eliminar el dispositivo.' });
        }

        logger.info(`[DISPOSITIVO] Dispositivo marcado como eliminado con ID: ${id}.`);
        res.status(200).json({ message: 'Dispositivo marcado como eliminado correctamente.' });
    } catch (error) {
        logger.error('Error al borrar el dispositivo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al borrar el dispositivo.' });
    }
};

module.exports = dispositivosCtl;
