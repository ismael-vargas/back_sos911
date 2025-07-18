// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (ORM) - Necesario para relaciones
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Se mantiene por consistencia

const presionesBotonPanicoCtl = {};

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

// 1. CREAR UNA NUEVA PRESIÓN DEL BOTÓN DE PÁNICO
presionesBotonPanicoCtl.createPanicButtonPress = async (req, res) => {
    const logger = getLogger(req);
    // Usamos clienteId y ubicacionesClienteId para que coincidan con las columnas de la DB
    const { clienteId, ubicacionesClienteId } = req.body; 
    logger.info(`[PRESION_BOTON_PANICO] Solicitud de creación: clienteId=${clienteId}, ubicacionesClienteId=${ubicacionesClienteId}`);

    // Validar campos obligatorios
    if (!clienteId || !ubicacionesClienteId) {
        logger.warn('[PRESION_BOTON_PANICO] Creación fallida: campos obligatorios faltantes.');
        return res.status(400).json({ message: 'Los campos clienteId y ubicacionesClienteId son requeridos.' });
    }

    try {
        // Verificar si el cliente existe en SQL
        const [existingClienteSQL] = await sql.promise().query("SELECT id FROM clientes WHERE id = ? AND estado = 'activo'", [clienteId]);
        if (existingClienteSQL.length === 0) {
            logger.warn(`[PRESION_BOTON_PANICO] Cliente no encontrado o inactivo con ID: ${clienteId}.`);
            return res.status(404).json({ error: 'Cliente no encontrado o inactivo.' });
        }

        // Verificar si la ubicación existe en SQL
        const [existingUbicacionSQL] = await sql.promise().query("SELECT id FROM ubicaciones_clientes WHERE id = ? AND estado = 'activo'", [ubicacionesClienteId]);
        if (existingUbicacionSQL.length === 0) {
            logger.warn(`[PRESION_BOTON_PANICO] Ubicación no encontrada o inactiva con ID: ${ubicacionesClienteId}.`);
            return res.status(404).json({ error: 'Ubicación no encontrada o inactiva.' });
        }

        // Crear la nueva presión del botón de pánico usando SQL directo
        const [resultadoSQL] = await sql.promise().query(
            // CORREGIDO: Usar ubicacionesClienteId en el INSERT
            "INSERT INTO presiones_boton_panicos (clienteId, ubicacionesClienteId, marca_tiempo, fecha_creacion, fecha_modificacion) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [clienteId, ubicacionesClienteId]
        );
        const newPressId = resultadoSQL.insertId;
        logger.info(`[PRESION_BOTON_PANICO] Presión de pánico creada exitosamente con ID: ${newPressId}.`);

        // Opcional: Aquí podrías llamar a la lógica para generar notificaciones e informes
        // Por ejemplo:
        // await notificacionesCtl.createNotification({ presionId: newPressId, clienteId: clienteId, ... });
        // await informesEstadisticasCtl.createReport({ presionId: newPressId, ... });

        // Obtener la presión recién creada para la respuesta
        const [createdPressSQL] = await sql.promise().query(
            `SELECT 
                p.id, 
                p.clienteId, 
                p.ubicacionesClienteId,  -- CORREGIDO: Usar ubicacionesClienteId en el SELECT
                p.marca_tiempo, 
                p.fecha_creacion, 
                p.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo,
                uc.latitud AS ubicacion_latitud,
                uc.longitud AS ubicacion_longitud
            FROM 
                presiones_boton_panicos p
            JOIN 
                clientes c ON p.clienteId = c.id
            JOIN
                ubicaciones_clientes uc ON p.ubicacionesClienteId = uc.id -- CORREGIDO: Usar ubicacionesClienteId en el JOIN
            WHERE 
                p.id = ?`, 
            [newPressId]
        );
        const createdPress = createdPressSQL[0];

        res.status(201).json({
            message: 'Presión de botón de pánico registrada exitosamente.',
            presion: {
                id: createdPress.id,
                clienteId: createdPress.clienteId,
                ubicacionesClienteId: createdPress.ubicacionesClienteId, // CORREGIDO: Usar ubicacionesClienteId en la respuesta
                marca_tiempo: createdPress.marca_tiempo,
                fecha_creacion: createdPress.fecha_creacion,
                fecha_modificacion: createdPress.fecha_modificacion,
                cliente_info: {
                    nombre: safeDecrypt(createdPress.cliente_nombre),
                    correo_electronico: safeDecrypt(createdPress.cliente_correo)
                },
                ubicacion_info: {
                    latitud: createdPress.ubicacion_latitud,
                    longitud: createdPress.ubicacion_longitud
                }
            }
        });
    } catch (error) {
        console.error(`[PRESION_BOTON_PANICO] Error al crear la presión del botón de pánico: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear la presión del botón de pánico.' });
    }
};

// 2. OBTENER TODAS LAS PRESIONES DEL BOTÓN DE PÁNICO
presionesBotonPanicoCtl.getAllPanicButtonPresses = async (req, res) => {
    const logger = getLogger(req);
    logger.info('[PRESION_BOTON_PANICO] Solicitud de obtención de todas las presiones del botón de pánico.');

    try {
        // Usar SQL directo para obtener presiones y unirse con clientes y ubicaciones
        const [presionesSQL] = await sql.promise().query(
            `SELECT 
                p.id, 
                p.clienteId, 
                p.ubicacionesClienteId,  -- CORREGIDO: Usar ubicacionesClienteId en el SELECT
                p.marca_tiempo, 
                p.fecha_creacion, 
                p.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo,
                uc.latitud AS ubicacion_latitud,
                uc.longitud AS ubicacion_longitud
            FROM 
                presiones_boton_panicos p
            JOIN 
                clientes c ON p.clienteId = c.id
            JOIN
                ubicaciones_clientes uc ON p.ubicacionesClienteId = uc.id -- CORREGIDO: Usar ubicacionesClienteId en el JOIN
            ORDER BY 
                p.marca_tiempo DESC`
        );
        
        const presionesCompletas = presionesSQL.map(pressSQL => ({
            id: pressSQL.id,
            clienteId: pressSQL.clienteId,
            ubicacionesClienteId: pressSQL.ubicacionesClienteId, // CORREGIDO: Usar ubicacionesClienteId
            marca_tiempo: pressSQL.marca_tiempo,
            fecha_creacion: pressSQL.fecha_creacion,
            fecha_modificacion: pressSQL.fecha_modificacion,
            cliente_info: {
                nombre: safeDecrypt(pressSQL.cliente_nombre),
                correo_electronico: safeDecrypt(pressSQL.cliente_correo)
            },
            ubicacion_info: {
                latitud: pressSQL.ubicacion_latitud,
                longitud: pressSQL.ubicacion_longitud
            }
        }));

        logger.info(`[PRESION_BOTON_PANICO] Se devolvieron ${presionesCompletas.length} presiones del botón de pánico.`);
        res.status(200).json(presionesCompletas);
    } catch (error) {
        console.error('Error al obtener las presiones del botón de pánico:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener las presiones del botón de pánico.' });
    }
};

// 3. OBTENER UNA PRESIÓN DEL BOTÓN DE PÁNICO POR ID
presionesBotonPanicoCtl.getPanicButtonPressById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[PRESION_BOTON_PANICO] Solicitud de obtención de presión por ID: ${id}`);

    try {
        // Usar SQL directo para obtener la presión por ID y unirse con clientes y ubicaciones
        const [presionSQL] = await sql.promise().query(
            `SELECT 
                p.id, 
                p.clienteId, 
                p.ubicacionesClienteId,  -- CORREGIDO: Usar ubicacionesClienteId en el SELECT
                p.marca_tiempo, 
                p.fecha_creacion, 
                p.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo,
                uc.latitud AS ubicacion_latitud,
                uc.longitud AS ubicacion_longitud
            FROM 
                presiones_boton_panicos p
            JOIN 
                clientes c ON p.clienteId = c.id
            JOIN
                ubicaciones_clientes uc ON p.ubicacionesClienteId = uc.id -- CORREGIDO: Usar ubicacionesClienteId en el JOIN
            WHERE 
                p.id = ?`, 
            [id]
        );
        
        if (presionSQL.length === 0) {
            logger.warn(`[PRESION_BOTON_PANICO] Presión del botón de pánico no encontrada con ID: ${id}.`);
            return res.status(404).json({ error: 'Presión del botón de pánico no encontrada.' });
        }
        
        const presion = presionSQL[0];
        logger.info(`[PRESION_BOTON_PANICO] Presión del botón de pánico encontrada con ID: ${id}.`);

        res.status(200).json({
            id: presion.id,
            clienteId: presion.clienteId,
            ubicacionesClienteId: presion.ubicacionesClienteId, // CORREGIDO: Usar ubicacionesClienteId
            marca_tiempo: presion.marca_tiempo,
            fecha_creacion: presion.fecha_creacion,
            fecha_modificacion: presion.fecha_modificacion,
            cliente_info: {
                nombre: safeDecrypt(presion.cliente_nombre),
                correo_electronico: safeDecrypt(presion.cliente_correo)
            },
            ubicacion_info: {
                latitud: presion.ubicacion_latitud,
                longitud: presion.ubicacion_longitud
            }
        });
    } catch (error) {
        console.error('Error al obtener la presión del botón de pánico:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener la presión del botón de pánico.' });
    }
};

// 4. ACTUALIZAR UNA PRESIÓN DEL BOTÓN DE PÁNICO (NO SE RECOMIENDA ACTUALIZAR ESTE TIPO DE REGISTRO)
// Este tipo de registro suele ser inmutable o solo se actualiza su estado (ej. 'resuelto').
// Si necesitas actualizar el estado, podrías añadir un campo 'estado' al modelo y gestionarlo.
// Por ahora, solo se permite la actualización de la marca_tiempo si es estrictamente necesario.
presionesBotonPanicoCtl.updatePanicButtonPress = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { marca_tiempo } = req.body; // Solo permitimos actualizar la marca_tiempo si es necesario
    logger.info(`[PRESION_BOTON_PANICO] Solicitud de actualización de presión con ID: ${id}`);

    try {
        // Verificar si la presión existe
        const [existingPressSQL] = await sql.promise().query("SELECT * FROM presiones_boton_panicos WHERE id = ?", [id]);
        if (existingPressSQL.length === 0) {
            logger.warn(`[PRESION_BOTON_PANICO] Presión del botón de pánico no encontrada para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Presión del botón de pánico no encontrada para actualizar.' });
        }
        
        // Preparar datos para SQL
        const camposSQL = [];
        const valoresSQL = [];
        
        if (marca_tiempo !== undefined) {
            camposSQL.push('marca_tiempo = ?');
            valoresSQL.push(marca_tiempo);
        }

        if (camposSQL.length === 0) {
            logger.warn(`[PRESION_BOTON_PANICO] No se proporcionaron campos para actualizar la presión con ID: ${id}.`);
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        valoresSQL.push(id); // Para el WHERE
        const consultaSQL = `UPDATE presiones_boton_panicos SET ${camposSQL.join(', ')}, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?`;
        const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, valoresSQL);
        
        if (resultadoSQLUpdate.affectedRows === 0) {
            logger.warn(`[PRESION_BOTON_PANICO] No se pudo actualizar la presión SQL con ID: ${id}.`);
        } else {
            logger.info(`[PRESION_BOTON_PANICO] Presión SQL actualizada con ID: ${id}`);
        }
        
        // Obtener la presión actualizada para la respuesta
        const [updatedPressSQL] = await sql.promise().query(
            `SELECT 
                p.id, 
                p.clienteId, 
                p.ubicacionesClienteId,  -- CORREGIDO: Usar ubicacionesClienteId en el SELECT
                p.marca_tiempo, 
                p.fecha_creacion, 
                p.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo,
                uc.latitud AS ubicacion_latitud,
                uc.longitud AS ubicacion_longitud
            FROM 
                presiones_boton_panicos p
            JOIN 
                clientes c ON p.clienteId = c.id
            JOIN
                ubicaciones_clientes uc ON p.ubicacionesClienteId = uc.id -- CORREGIDO: Usar ubicacionesClienteId en el JOIN
            WHERE 
                p.id = ?`, 
            [id]
        );
        const updatedPress = updatedPressSQL[0];

        res.status(200).json({ 
            message: 'Presión del botón de pánico actualizada correctamente.',
            presion: {
                id: updatedPress.id,
                clienteId: updatedPress.clienteId,
                ubicacionesClienteId: updatedPress.ubicacionesClienteId, // CORREGIDO: Usar ubicacionesClienteId
                marca_tiempo: updatedPress.marca_tiempo,
                fecha_creacion: updatedPress.fecha_creacion,
                fecha_modificacion: updatedPress.fecha_modificacion,
                cliente_info: {
                    nombre: safeDecrypt(updatedPress.cliente_nombre),
                    correo_electronico: safeDecrypt(updatedPress.cliente_correo)
                },
                ubicacion_info: {
                    latitud: updatedPress.ubicacion_latitud,
                    longitud: updatedPress.ubicacion_longitud
                }
            }
        });

    } catch (error) {
        console.error('Error al actualizar la presión del botón de pánico:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la presión del botón de pánico.' });
    }
};

// 5. ELIMINAR UNA PRESIÓN DEL BOTÓN DE PÁNICO (Borrado Lógico)
// En este caso, un registro de presión de pánico rara vez se elimina físicamente.
// Si se necesita un estado, se añadiría un campo 'estado' al modelo.
// Por ahora, se implementa una eliminación física simple si no hay un campo 'estado'.
// Si tu modelo tiene 'estado', se cambiará a borrado lógico.
presionesBotonPanicoCtl.deletePanicButtonPress = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[PRESION_BOTON_PANICO] Solicitud de eliminación de presión con ID: ${id}`);

    try {
        // Verificar si la presión existe
        const [existingPressSQL] = await sql.promise().query("SELECT id FROM presiones_boton_panicos WHERE id = ?", [id]);
        if (existingPressSQL.length === 0) {
            logger.warn(`[PRESION_BOTON_PANICO] Presión del botón de pánico no encontrada con ID: ${id}.`);
            return res.status(404).json({ error: 'Presión del botón de pánico no encontrada.' });
        }

        // Eliminar físicamente el registro (si no hay campo 'estado' en el modelo)
        // Si tu modelo presiones_boton_panico.model.js tiene un campo 'estado',
        // esta lógica debería cambiarse a un borrado lógico (UPDATE estado = 'eliminado').
        await sql.promise().query("DELETE FROM presiones_boton_panicos WHERE id = ?", [id]);
        
        logger.info(`[PRESION_BOTON_PANICO] Presión del botón de pánico eliminada físicamente: id=${id}.`);
        res.status(200).json({ message: 'Presión del botón de pánico eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la presión del botón de pánico:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al eliminar la presión del botón de pánico.' });
    }
};

module.exports = presionesBotonPanicoCtl;
