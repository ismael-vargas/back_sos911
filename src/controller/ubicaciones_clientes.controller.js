// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL) - Necesario para relaciones
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Se mantiene por consistencia

const ubicacionClienteCtl = {};

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

// 1. CREAR UNA NUEVA UBICACIÓN DE CLIENTE
ubicacionClienteCtl.createClientLocation = async (req, res) => {
    const logger = getLogger(req);
    // Usamos clienteId para que coincida con la columna de la DB (camelCase generada por Sequelize)
    const { clienteId, latitud, longitud, marca_tiempo, estado } = req.body; 
    logger.info(`[UBICACIONES_CLIENTES] Solicitud de creación: clienteId=${clienteId}, latitud=${latitud}, longitud=${longitud}`);

    // Validar campos obligatorios
    if (!clienteId || !latitud || !longitud) {
        logger.warn('[UBICACIONES_CLIENTES] Creación fallida: campos obligatorios faltantes.');
        return res.status(400).json({ message: 'Los campos clienteId, latitud y longitud son requeridos.' });
    }

    try {
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Verificar si el cliente existe en SQL
        const [existingClienteSQL] = await sql.promise().query("SELECT id FROM clientes WHERE id = ? AND estado = 'activo'", [clienteId]);
        if (existingClienteSQL.length === 0) {
            logger.warn(`[UBICACIONES_CLIENTES] Cliente no encontrado o inactivo con ID: ${clienteId}.`);
            return res.status(404).json({ error: 'Cliente no encontrado o inactivo.' });
        }

        // Crear la nueva ubicación usando ORM (orm.ubicacion_cliente.create())
        // fecha_modificacion NO se incluye en la creación, se actualizará en modificaciones
        const nuevaUbicacionSQL = {
            clienteId: clienteId,
            latitud: latitud,
            longitud: longitud,
            marca_tiempo: marca_tiempo || formattedNow, // Usa marca_tiempo del body o la hora actual formateada
            estado: estado || 'activo',
            fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
        };
        const ubicacionGuardadaSQL = await orm.ubicacion_cliente.create(nuevaUbicacionSQL); // Usando ORM para crear
        const newLocationId = ubicacionGuardadaSQL.id; // Obtener el ID insertado por ORM
        logger.info(`[UBICACIONES_CLIENTES] Ubicación creada exitosamente con ID: ${newLocationId} usando ORM.`);

        // Obtener la ubicación recién creada para la respuesta
        const [createdLocationSQL] = await sql.promise().query(
            `SELECT 
                uc.id, 
                uc.clienteId, 
                uc.latitud, 
                uc.longitud, 
                uc.marca_tiempo, 
                uc.estado, 
                uc.fecha_creacion, 
                uc.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                ubicaciones_clientes uc
            JOIN 
                clientes c ON uc.clienteId = c.id
            WHERE 
                uc.id = ?`, 
            [newLocationId]
        );
        const createdLocation = createdLocationSQL[0];

        res.status(201).json({
            message: 'Ubicación registrada exitosamente.',
            ubicacion: {
                id: createdLocation.id,
                clienteId: createdLocation.clienteId,
                latitud: createdLocation.latitud,
                longitud: createdLocation.longitud,
                marca_tiempo: createdLocation.marca_tiempo,
                estado: createdLocation.estado,
                fecha_creacion: createdLocation.fecha_creacion,
                fecha_modificacion: createdLocation.fecha_modificacion, // Puede ser null si no se ha modificado
                cliente_info: {
                    nombre: safeDecrypt(createdLocation.cliente_nombre),
                    correo_electronico: safeDecrypt(createdLocation.cliente_correo)
                }
            }
        });
    } catch (error) {
        console.error(`[UBICACIONES_CLIENTES] Error al crear la ubicación: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear la ubicación.' });
    }
};

// 2. OBTENER TODAS LAS UBICACIONES DE CLIENTES
ubicacionClienteCtl.getAllClientLocations = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Para manejar borrado lógico
    logger.info(`[UBICACIONES_CLIENTES] Solicitud de obtención de todas las ubicaciones (incluirEliminados: ${incluirEliminados})`);

    try {
        // Se usa la conexión 'sql' para una consulta directa
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE uc.estado = 'activo'";
        // Unir con la tabla de clientes para obtener información del cliente
        const [locationsSQL] = await sql.promise().query(
            `SELECT 
                uc.id, 
                uc.clienteId, 
                uc.latitud, 
                uc.longitud, 
                uc.marca_tiempo, 
                uc.estado, 
                uc.fecha_creacion, 
                uc.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                ubicaciones_clientes uc
            JOIN 
                clientes c ON uc.clienteId = c.id
            ${estadoQuery}
            ORDER BY 
                uc.fecha_creacion DESC`
        );
        
        const locationsCompletas = locationsSQL.map(locSQL => ({
            id: locSQL.id,
            clienteId: locSQL.clienteId,
            latitud: locSQL.latitud,
            longitud: locSQL.longitud,
            marca_tiempo: locSQL.marca_tiempo,
            estado: locSQL.estado,
            fecha_creacion: locSQL.fecha_creacion,
            fecha_modificacion: locSQL.fecha_modificacion,
            cliente_info: {
                nombre: safeDecrypt(locSQL.cliente_nombre),
                correo_electronico: safeDecrypt(locSQL.cliente_correo)
            }
        }));

        logger.info(`[UBICACIONES_CLIENTES] Se devolvieron ${locationsCompletas.length} ubicaciones.`);
        res.status(200).json(locationsCompletas);
    } catch (error) {
        console.error('Error al obtener las ubicaciones de clientes:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener las ubicaciones.' });
    }
};

// 3. OBTENER UNA UBICACIÓN DE CLIENTE POR ID
ubicacionClienteCtl.getClientLocationById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[UBICACIONES_CLIENTES] Solicitud de obtención de ubicación por ID: ${id}`);

    try {
        // Usar SQL directo para obtener la ubicación por ID y unirse con clientes
        const [locationSQL] = await sql.promise().query(
            `SELECT 
                uc.id, 
                uc.clienteId, 
                uc.latitud, 
                uc.longitud, 
                uc.marca_tiempo, 
                uc.estado, 
                uc.fecha_creacion, 
                uc.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                ubicaciones_clientes uc
            JOIN 
                clientes c ON uc.clienteId = c.id
            WHERE 
                uc.id = ? AND uc.estado = 'activo'`, 
            [id]
        );
        
        if (locationSQL.length === 0) {
            logger.warn(`[UBICACIONES_CLIENTES] Ubicación no encontrada o inactiva con ID: ${id}.`);
            return res.status(404).json({ error: 'Ubicación no encontrada o inactiva.' });
        }
        
        const location = locationSQL[0];
        logger.info(`[UBICACIONES_CLIENTES] Ubicación encontrada con ID: ${id}.`);

        res.status(200).json({
            id: location.id,
            clienteId: location.clienteId,
            latitud: location.latitud,
            longitud: location.longitud,
            marca_tiempo: location.marca_tiempo,
            estado: location.estado,
            fecha_creacion: location.fecha_creacion,
            fecha_modificacion: location.fecha_modificacion,
            cliente_info: {
                nombre: safeDecrypt(location.cliente_nombre),
                correo_electronico: safeDecrypt(location.cliente_correo)
            }
        });
    } catch (error) {
        console.error('Error al obtener la ubicación de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener la ubicación.' });
    }
};

// 4. ACTUALIZAR UNA UBICACIÓN DE CLIENTE
ubicacionClienteCtl.updateClientLocation = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { latitud, longitud, marca_tiempo, estado } = req.body; 
    logger.info(`[UBICACIONES_CLIENTES] Solicitud de actualización de ubicación con ID: ${id}`);

    try {
        // Verificar si la ubicación existe y está activa
        const [existingLocationSQL] = await sql.promise().query("SELECT * FROM ubicaciones_clientes WHERE id = ? AND estado = 'activo'", [id]);
        if (existingLocationSQL.length === 0) {
            logger.warn(`[UBICACIONES_CLIENTES] Ubicación no encontrada o inactiva para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Ubicación no encontrada o inactiva para actualizar.' });
        }
        
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar datos para SQL
        const camposSQL = [];
        const valoresSQL = [];
        
        if (latitud !== undefined) {
            camposSQL.push('latitud = ?');
            valoresSQL.push(latitud);
        }
        if (longitud !== undefined) {
            camposSQL.push('longitud = ?');
            valoresSQL.push(longitud);
        }
        if (marca_tiempo !== undefined) {
            camposSQL.push('marca_tiempo = ?');
            valoresSQL.push(marca_tiempo); // Asumiendo que marca_tiempo del body ya viene formateado o es un string
        }
        if (estado !== undefined) {
            camposSQL.push('estado = ?');
            valoresSQL.push(estado);
        }

        if (camposSQL.length === 0) {
            logger.warn(`[UBICACIONES_CLIENTES] No se proporcionaron campos para actualizar la ubicación con ID: ${id}.`);
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        // Siempre actualizar fecha_modificacion en SQL
        camposSQL.push('fecha_modificacion = ?');
        valoresSQL.push(formattedNow); // CAMBIO: Usar formattedNow

        valoresSQL.push(id); // Para el WHERE
        // CAMBIO: Se corrigió la consulta SQL para usar el placeholder correcto para fecha_modificacion
        const consultaSQL = `UPDATE ubicaciones_clientes SET ${camposSQL.join(', ')} WHERE id = ?`;
        const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, valoresSQL);
        
        if (resultadoSQLUpdate.affectedRows === 0) {
            logger.warn(`[UBICACIONES_CLIENTES] No se pudo actualizar la ubicación SQL con ID: ${id}.`);
        } else {
            logger.info(`[UBICACIONES_CLIENTES] Ubicación SQL actualizada con ID: ${id}`);
        }
        
        // Obtener la ubicación actualizada para la respuesta
        const [updatedLocationSQL] = await sql.promise().query(
            `SELECT 
                uc.id, 
                uc.clienteId, 
                uc.latitud, 
                uc.longitud, 
                uc.marca_tiempo, 
                uc.estado, 
                uc.fecha_creacion, 
                uc.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                ubicaciones_clientes uc
            JOIN 
                clientes c ON uc.clienteId = c.id
            WHERE 
                uc.id = ?`, 
            [id]
        );
        const updatedLocation = updatedLocationSQL[0];

        res.status(200).json({ 
            message: 'Ubicación actualizada correctamente.',
            ubicacion: {
                id: updatedLocation.id,
                clienteId: updatedLocation.clienteId,
                latitud: updatedLocation.latitud,
                longitud: updatedLocation.longitud,
                marca_tiempo: updatedLocation.marca_tiempo,
                estado: updatedLocation.estado,
                fecha_creacion: updatedLocation.fecha_creacion,
                fecha_modificacion: updatedLocation.fecha_modificacion,
                cliente_info: {
                    nombre: safeDecrypt(updatedLocation.cliente_nombre),
                    correo_electronico: safeDecrypt(updatedLocation.cliente_correo)
                }
            }
        });

    } catch (error) {
        console.error('Error al actualizar la ubicación de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la ubicación.' });
    }
};

// 5. ELIMINAR UNA UBICACIÓN DE CLIENTE (Borrado Lógico)
ubicacionClienteCtl.deleteClientLocation = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[UBICACIONES_CLIENTES] Solicitud de eliminación lógica de ubicación con ID: ${id}`);

    try {
        // Verificar si la ubicación existe y está activa
        const [existingLocationSQL] = await sql.promise().query("SELECT id FROM ubicaciones_clientes WHERE id = ? AND estado = 'activo'", [id]);
        if (existingLocationSQL.length === 0) {
            logger.warn(`[UBICACIONES_CLIENTES] Ubicación no encontrada o ya eliminada con ID: ${id}`);
            return res.status(404).json({ error: 'Ubicación no encontrada o ya estaba eliminado.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado en SQL directo
        const [resultadoSQL] = await sql.promise().query("UPDATE ubicaciones_clientes SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.error(`[UBICACIONES_CLIENTES] No se pudo marcar como eliminado la ubicación con ID: ${id}.`);
            return res.status(500).json({ error: 'No se pudo eliminar la ubicación.' });
        }

        logger.info(`[UBICACIONES_CLIENTES] Ubicación marcada como eliminada: id=${id}.`);
        res.status(200).json({ message: 'Ubicación marcada como eliminada correctamente.' });
    } catch (error) {
        console.error('Error al borrar la ubicación de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al borrar la ubicación.' });
    }
};

module.exports = ubicacionClienteCtl;
