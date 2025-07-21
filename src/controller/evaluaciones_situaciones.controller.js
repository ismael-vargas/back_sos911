// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL) - Necesario para relaciones
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Se mantiene por consistencia

const evaluacionesSituacionesCtl = {};

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

// 1. CREAR UNA NUEVA EVALUACIÓN DE SITUACIÓN
evaluacionesSituacionesCtl.createSituationEvaluation = async (req, res) => {
    const logger = getLogger(req);
    
    // Usamos notificacioneId para consistencia con tu base de datos
    const { notificacioneId, evaluacion, detalle, estado } = req.body; 

    logger.info(`[EVALUACIONES_SITUACIONES] Solicitud de creación: notificacioneId=${notificacioneId}, evaluacion=${evaluacion}`);

    // Validar campos obligatorios
    if (!notificacioneId || !evaluacion) {
        logger.warn('[EVALUACIONES_SITUACIONES] Creación fallida: campos obligatorios faltantes.');
        return res.status(400).json({ message: 'Los campos notificacioneId y evaluacion son requeridos.' });
    }

    try {
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Verificar si la notificación existe
        const [existingNotificacionSQL] = await sql.promise().query("SELECT id FROM notificaciones WHERE id = ? AND estado != 'eliminado'", [notificacioneId]);
        if (existingNotificacionSQL.length === 0) {
            logger.warn(`[EVALUACIONES_SITUACIONES] Notificación no encontrada o eliminada con ID: ${notificacioneId}.`);
            return res.status(404).json({ error: 'Notificación no encontrada o eliminada.' });
        }

        // Cifrar el detalle si existe
        const detalleCifrado = detalle ? cifrarDato(detalle) : null;

        // Crear la nueva evaluación usando ORM (como usuario.controller.js)
        // CORREGIDO: Se cambió 'orm.evaluaciones_situaciones' a 'orm.evaluaciones_situacion' para coincidir con la exportación del ORM
        const nuevaEvaluacion = await orm.evaluaciones_situacion.create({
            notificacioneId: notificacioneId,
            evaluacion: evaluacion,
            detalle: detalleCifrado,
            estado: estado || 'activo',
            fecha_creacion: formattedNow, // (hora local formateada)
        });
        
        const newEvaluationId = nuevaEvaluacion.id; // Obtener el ID insertado por ORM
        logger.info(`[EVALUACIONES_SITUACIONES] Evaluación creada exitosamente con ID: ${newEvaluationId}.`);

        // AHORA: Incrementar el contador de 'respuesta' en la notificación asociada
        await sql.promise().query(
            "UPDATE notificaciones SET respuesta = IFNULL(respuesta, 0) + 1, fecha_modificacion = ? WHERE id = ?",
            [formattedNow, notificacioneId] // Usar formattedNow
        );
        logger.info(`[EVALUACIONES_SITUACIONES] Contador de respuesta de notificación ${notificacioneId} incrementado.`);


        // Obtener la evaluación recién creada
        const [createdEvaluationSQL] = await sql.promise().query(
            `SELECT 
                es.id, 
                es.notificacioneId, 
                es.evaluacion, 
                es.detalle, 
                es.estado, 
                es.fecha_creacion, 
                es.fecha_modificacion,
                n.estado AS notificacion_estado,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                evaluaciones_situaciones es
            JOIN 
                notificaciones n ON es.notificacioneId = n.id
            JOIN
                presiones_boton_panicos pbp ON n.presionesBotonPanicoId = pbp.id
            JOIN
                clientes c ON pbp.clienteId = c.id
            WHERE 
                es.id = ?`, 
            [newEvaluationId]
        );
        
        const createdEvaluation = createdEvaluationSQL[0];

        res.status(201).json({
            message: 'Evaluación de situación registrada exitosamente.',
            evaluacion: {
                id: createdEvaluation.id,
                notificacioneId: createdEvaluation.notificacioneId, 
                evaluacion: createdEvaluation.evaluacion, 
                detalle: safeDecrypt(createdEvaluation.detalle), // Descifrar detalle
                estado: createdEvaluation.estado,
                fecha_creacion: createdEvaluation.fecha_creacion,
                fecha_modificacion: createdEvaluation.fecha_modificacion, // Puede ser null si no se ha modificado
                notificacion_info: {
                    estado: createdEvaluation.notificacion_estado
                },
                presion_info: {
                    marca_tiempo: createdEvaluation.marca_tiempo
                },
                cliente_info: {
                    nombre: safeDecrypt(createdEvaluation.cliente_nombre),
                    correo_electronico: safeDecrypt(createdEvaluation.cliente_correo)
                }
            }
        });
    } catch (error) {
        console.error(`[EVALUACIONES_SITUACIONES] Error al crear la evaluación: ${error.message}`);
        res.status(500).json({ error: 'Error interno del servidor al crear la evaluación de situación.' });
    }
};

// 2. OBTENER TODAS LAS EVALUACIONES DE SITUACIONES
evaluacionesSituacionesCtl.getAllSituationEvaluations = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Para manejar borrado lógico
    logger.info(`[EVALUACIONES_SITUACIONES] Solicitud de obtención de todas las evaluaciones (incluirEliminados: ${incluirEliminados})`);

    try {
        // Se usa la conexión 'sql' para una consulta directa
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE es.estado = 'activo'";
        // Unir con notificaciones, presiones_boton_panicos y clientes para obtener información completa
        const [evaluacionesSQL] = await sql.promise().query(
            `SELECT 
                es.id, 
                es.notificacioneId,  
                es.evaluacion, 
                es.detalle, 
                es.estado, 
                es.fecha_creacion, 
                es.fecha_modificacion,
                n.estado AS notificacion_estado,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                evaluaciones_situaciones es
            JOIN 
                notificaciones n ON es.notificacioneId = n.id  
            JOIN
                presiones_boton_panicos pbp ON n.presionesBotonPanicoId = pbp.id
            JOIN
                clientes c ON pbp.clienteId = c.id
            ${estadoQuery}
            ORDER BY 
                es.fecha_creacion DESC`
        );
        
        const evaluacionesCompletas = evaluacionesSQL.map(evalSQL => ({
            id: evalSQL.id,
            notificacioneId: evalSQL.notificacioneId,
            evaluacion: evalSQL.evaluacion, 
            detalle: safeDecrypt(evalSQL.detalle), // Descifrar detalle
            estado: evalSQL.estado,
            fecha_creacion: evalSQL.fecha_creacion,
            fecha_modificacion: evalSQL.fecha_modificacion,
            notificacion_info: {
                estado: evalSQL.notificacion_estado
            },
            presion_info: {
                marca_tiempo: evalSQL.presion_marca_tiempo
            },
            cliente_info: {
                nombre: safeDecrypt(evalSQL.cliente_nombre),
                correo_electronico: safeDecrypt(evalSQL.cliente_correo)
            }
        }));

        logger.info(`[EVALUACIONES_SITUACIONES] Se devolvieron ${evaluacionesCompletas.length} evaluaciones.`);
        res.status(200).json(evaluacionesCompletas);
    } catch (error) {
        console.error('Error al obtener las evaluaciones de situaciones:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener las evaluaciones de situaciones.' });
    }
};

// 3. OBTENER UNA EVALUACIÓN DE SITUACIÓN POR ID
evaluacionesSituacionesCtl.getSituationEvaluationById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[EVALUACIONES_SITUACIONES] Solicitud de obtención de evaluación por ID: ${id}`);

    try {
        // Usar SQL directo para obtener la evaluación por ID
        const [evaluacionSQL] = await sql.promise().query(
            `SELECT 
                es.id, 
                es.notificacioneId, 
                es.evaluacion, 
                es.detalle, 
                es.estado, 
                es.fecha_creacion, 
                es.fecha_modificacion,
                n.estado AS notificacion_estado,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                evaluaciones_situaciones es
            JOIN 
                notificaciones n ON es.notificacioneId = n.id
            JOIN
                presiones_boton_panicos pbp ON n.presionesBotonPanicoId = pbp.id
            JOIN
                clientes c ON pbp.clienteId = c.id
            WHERE 
                es.id = ? AND es.estado = 'activo'`, 
            [id]
        );
        
        if (evaluacionSQL.length === 0) {
            logger.warn(`[EVALUACIONES_SITUACIONES] Evaluación no encontrada o eliminada con ID: ${id}.`);
            return res.status(404).json({ error: 'Evaluación no encontrada o eliminada.' });
        }
        
        const evaluacion = evaluacionSQL[0];
        logger.info(`[EVALUACIONES_SITUACIONES] Evaluación encontrada con ID: ${id}.`);

        res.status(200).json({
            id: evaluacion.id,
            notificacioneId: evaluacion.notificacioneId,
            evaluacion: evaluacion.evaluacion, 
            detalle: safeDecrypt(evaluacion.detalle), // Descifrar detalle
            estado: evaluacion.estado,
            fecha_creacion: evaluacion.fecha_creacion,
            fecha_modificacion: evaluacion.fecha_modificacion,
            notificacion_info: {
                estado: evaluacion.notificacion_estado
            },
            presion_info: {
                marca_tiempo: evaluacion.marca_tiempo
            },
            cliente_info: {
                nombre: safeDecrypt(evaluacion.cliente_nombre),
                correo_electronico: safeDecrypt(evaluacion.cliente_correo)
            }
        });
    } catch (error) {
        console.error('Error al obtener la evaluación de situación:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener la evaluación de situación.' });
    }
};

// 4. ACTUALIZAR UNA EVALUACIÓN DE SITUACIÓN
evaluacionesSituacionesCtl.updateSituationEvaluation = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { evaluacion, detalle, estado } = req.body; 
    logger.info(`[EVALUACIONES_SITUACIONES] Solicitud de actualización de evaluación con ID: ${id}`);

    try {
        // Verificar si la evaluación existe y está activa
        const [existingEvaluationSQL] = await sql.promise().query("SELECT * FROM evaluaciones_situaciones WHERE id = ? AND estado = 'activo'", [id]);
        if (existingEvaluationSQL.length === 0) {
            logger.warn(`[EVALUACIONES_SITUACIONES] Evaluación no encontrada o inactiva para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Evaluación no encontrada o inactiva para actualizar.' });
        }
        
        const now = new Date(); // Obtiene la fecha y hora actual del servidor
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar datos para SQL
        const camposSQL = [];
        const valoresSQL = [];
        
        if (evaluacion !== undefined) {
            camposSQL.push('evaluacion = ?');
            valoresSQL.push(evaluacion);
        }
        if (detalle !== undefined) {
            camposSQL.push('detalle = ?');
            valoresSQL.push(cifrarDato(detalle)); // Cifrar detalle al actualizar
        }
        if (estado !== undefined) {
            camposSQL.push('estado = ?');
            valoresSQL.push(estado);
        }

        if (camposSQL.length === 0) {
            logger.warn(`[EVALUACIONES_SITUACIONES] No se proporcionaron campos para actualizar la evaluación con ID: ${id}.`);
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        // Siempre actualizar fecha_modificacion en SQL
        camposSQL.push('fecha_modificacion = ?');
        valoresSQL.push(formattedNow); // Usar formattedNow

        valoresSQL.push(id); // Para el WHERE
        const consultaSQL = `UPDATE evaluaciones_situaciones SET ${camposSQL.join(', ')} WHERE id = ?`;
        const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, valoresSQL);
        
        if (resultadoSQLUpdate.affectedRows === 0) {
            logger.warn(`[EVALUACIONES_SITUACIONES] No se pudo actualizar la evaluación SQL con ID: ${id}.`);
        } else {
            logger.info(`[EVALUACIONES_SITUACIONES] Evaluación SQL actualizada con ID: ${id}`);
        }
        
        // Obtener la evaluación actualizada para la respuesta
        const [updatedEvaluationSQL] = await sql.promise().query(
            `SELECT 
                es.id, 
                es.notificacioneId, 
                es.evaluacion, 
                es.detalle, 
                es.estado, 
                es.fecha_creacion, 
                es.fecha_modificacion,
                n.estado AS notificacion_estado,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                evaluaciones_situaciones es
            JOIN 
                notificaciones n ON es.notificacioneId = n.id
            JOIN
                presiones_boton_panicos pbp ON n.presionesBotonPanicoId = pbp.id
            JOIN
                clientes c ON pbp.clienteId = c.id
            WHERE 
                es.id = ?`, 
            [id]
        );
        const updatedEvaluation = updatedEvaluationSQL[0];

        res.status(200).json({ 
            message: 'Evaluación de situación actualizada correctamente.',
            evaluacion: {
                id: updatedEvaluation.id,
                notificacioneId: updatedEvaluation.notificacioneId,
                evaluacion: updatedEvaluation.evaluacion,
                detalle: safeDecrypt(updatedEvaluation.detalle), // Descifrar detalle
                estado: updatedEvaluation.estado,
                fecha_creacion: updatedEvaluation.fecha_creacion,
                fecha_modificacion: updatedEvaluation.fecha_modificacion,
                notificacion_info: {
                    estado: updatedEvaluation.notificacion_estado
                },
                presion_info: {
                    marca_tiempo: updatedEvaluation.marca_tiempo
                },
                cliente_info: {
                    nombre: safeDecrypt(updatedEvaluation.cliente_nombre),
                    correo_electronico: safeDecrypt(updatedEvaluation.cliente_correo)
                }
            }
        });
    } catch (error) {
        console.error('Error al actualizar la evaluación de situación:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la evaluación de situación.' });
    }
};

// 5. ELIMINAR UNA EVALUACIÓN DE SITUACIÓN (Borrado Lógico)
evaluacionesSituacionesCtl.deleteSituationEvaluation = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[EVALUACIONES_SITUACIONES] Solicitud de eliminación lógica de evaluación con ID: ${id}`);

    try {
        // Verificar si la evaluación existe y está activa
        const [existingEvaluationSQL] = await sql.promise().query("SELECT id FROM evaluaciones_situaciones WHERE id = ? AND estado = 'activo'", [id]);
        if (existingEvaluationSQL.length === 0) {
            logger.warn(`[EVALUACIONES_SITUACIONES] Evaluación no encontrada o ya eliminada con ID: ${id}`);
            return res.status(404).json({ error: 'Evaluación no encontrada o ya estaba eliminada.' });
        }

        const now = new Date(); // Obtiene la fecha y hora actual del servidor
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado en SQL directo
        const [resultadoSQL] = await sql.promise().query("UPDATE evaluaciones_situaciones SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.error(`[EVALUACIONES_SITUACIONES] No se pudo marcar como eliminado la evaluación con ID: ${id}.`);
            return res.status(500).json({ error: 'No se pudo eliminar la evaluación.' });
        }

        logger.info(`[EVALUACIONES_SITUACIONES] Evaluación marcada como eliminada: id=${id}.`);
        res.status(200).json({ message: 'Evaluación de situación marcada como eliminada correctamente.' });
    } catch (error) {
        console.error('Error al borrar la evaluación de situación:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al borrar la evaluación de situación.' });
    }
};

module.exports = evaluacionesSituacionesCtl;
