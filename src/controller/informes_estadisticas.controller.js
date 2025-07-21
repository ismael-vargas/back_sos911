// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL) - Necesario para relaciones
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Se mantiene por consistencia

const informesCtl = {};

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

// 1. CREAR UN NUEVO INFORME DE ESTADÍSTICAS
informesCtl.createReport = async (req, res) => {
    const logger = getLogger(req);
    const {
        presionesBotonPanicoId, // Usamos el nombre exacto de la columna en la DB
        numero_notificaciones,
        numero_respuestas,
        evaluaciones_SOS,
        evaluaciones_911,
        evaluaciones_innecesaria,
        estado
    } = req.body;

    logger.info(`[INFORMES_ESTADISTICAS] Solicitud de creación: presionesBotonPanicoId=${presionesBotonPanicoId}`);

    // Validar campos obligatorios
    if (!presionesBotonPanicoId) {
        logger.warn('[INFORMES_ESTADISTICAS] Creación fallida: presionesBotonPanicoId es obligatorio.');
        return res.status(400).json({ message: 'El campo presionesBotonPanicoId es requerido.' });
    }

    try {
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Verificar si la presión del botón de pánico existe en SQL
        const [existingPresionSQL] = await sql.promise().query("SELECT id FROM presiones_boton_panicos WHERE id = ? AND estado = 'activo'", [presionesBotonPanicoId]);
        if (existingPresionSQL.length === 0) {
            logger.warn(`[INFORMES_ESTADISTICAS] Presión del botón de pánico no encontrada con ID: ${presionesBotonPanicoId}.`);
            return res.status(404).json({ error: 'Presión del botón de pánico no encontrada o inactiva.' });
        }

        // Crear el nuevo informe de estadísticas usando ORM (orm.informes_estadisticas.create())
        // fecha_modificacion NO se incluye en la creación, se actualizará en modificaciones
        const nuevoInformeSQL = {
            presionesBotonPanicoId: presionesBotonPanicoId,
            numero_notificaciones: numero_notificaciones || 0,
            numero_respuestas: numero_respuestas || 0,
            evaluaciones_SOS: evaluaciones_SOS || 0,
            evaluaciones_911: evaluaciones_911 || 0,
            evaluaciones_innecesaria: evaluaciones_innecesaria || 0,
            estado: estado || 'activo',
            fecha_creacion: formattedNow, // (hora local formateada)
        };
        const informeGuardadoSQL = await orm.informes_estadisticas.create(nuevoInformeSQL); // Usando ORM para crear
        const newReportId = informeGuardadoSQL.id; // Obtener el ID insertado por ORM
        logger.info(`[INFORMES_ESTADISTICAS] Informe creado exitosamente con ID: ${newReportId} usando ORM.`);

        // Obtener el informe recién creado para la respuesta
        const [createdReportSQL] = await sql.promise().query(
            `SELECT 
                ie.id, 
                ie.presionesBotonPanicoId, 
                ie.numero_notificaciones,
                ie.numero_respuestas,
                ie.evaluaciones_SOS,
                ie.evaluaciones_911,
                ie.evaluaciones_innecesaria,
                ie.estado,
                ie.fecha_creacion, 
                ie.fecha_modificacion,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                informes_estadisticas ie
            JOIN 
                presiones_boton_panicos pbp ON ie.presionesBotonPanicoId = pbp.id
            JOIN
                clientes c ON pbp.clienteId = c.id
            WHERE 
                ie.id = ?`, 
            [newReportId]
        );
        const createdReport = createdReportSQL[0];

        res.status(201).json({
            message: 'Informe creado exitosamente.',
            informe: {
                id: createdReport.id,
                presionesBotonPanicoId: createdReport.presionesBotonPanicoId,
                numero_notificaciones: createdReport.numero_notificaciones,
                numero_respuestas: createdReport.numero_respuestas,
                evaluaciones_SOS: createdReport.evaluaciones_SOS,
                evaluaciones_911: createdReport.evaluaciones_911,
                evaluaciones_innecesaria: createdReport.evaluaciones_innecesaria,
                estado: createdReport.estado,
                fecha_creacion: createdReport.fecha_creacion,
                fecha_modificacion: createdReport.fecha_modificacion,
                presion_info: {
                    marca_tiempo: createdReport.presion_marca_tiempo
                },
                cliente_info: {
                    nombre: safeDecrypt(createdReport.cliente_nombre),
                    correo_electronico: safeDecrypt(createdReport.cliente_correo)
                }
            }
        });
    } catch (error) {
        console.error(`[INFORMES_ESTADISTICAS] Error al crear el informe: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear el informe.' });
    }
};

// 2. OBTENER TODOS LOS INFORMES DE ESTADÍSTICAS
informesCtl.getAllReports = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Para manejar borrado lógico
    logger.info(`[INFORMES_ESTADISTICAS] Solicitud de obtención de todos los informes (incluirEliminados: ${incluirEliminados})`);

    try {
        // Se usa la conexión 'sql' para una consulta directa
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE ie.estado = 'activo'";
        // Unir con presiones_boton_panicos y clientes para obtener información completa
        const [informesSQL] = await sql.promise().query(
            `SELECT 
                ie.id, 
                ie.presionesBotonPanicoId, 
                ie.numero_notificaciones,
                ie.numero_respuestas,
                ie.evaluaciones_SOS,
                ie.evaluaciones_911,
                ie.evaluaciones_innecesaria,
                ie.estado,
                ie.fecha_creacion, 
                ie.fecha_modificacion,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                informes_estadisticas ie
            JOIN 
                presiones_boton_panicos pbp ON ie.presionesBotonPanicoId = pbp.id
            JOIN
                clientes c ON pbp.clienteId = c.id
            ${estadoQuery}
            ORDER BY 
                ie.fecha_creacion DESC`
        );
        
        const informesCompletos = informesSQL.map(reportSQL => ({
            id: reportSQL.id,
            presionesBotonPanicoId: reportSQL.presionesBotonPanicoId,
            numero_notificaciones: reportSQL.numero_notificaciones,
            numero_respuestas: reportSQL.numero_respuestas,
            evaluaciones_SOS: reportSQL.evaluaciones_SOS,
            evaluaciones_911: reportSQL.evaluaciones_911,
            evaluaciones_innecesaria: reportSQL.evaluaciones_innecesaria,
            estado: reportSQL.estado,
            fecha_creacion: reportSQL.fecha_creacion,
            fecha_modificacion: reportSQL.fecha_modificacion,
            presion_info: {
                marca_tiempo: reportSQL.presion_marca_tiempo
            },
            cliente_info: {
                nombre: safeDecrypt(reportSQL.cliente_nombre),
                correo_electronico: safeDecrypt(reportSQL.cliente_correo)
            }
        }));

        logger.info(`[INFORMES_ESTADISTICAS] Se devolvieron ${informesCompletos.length} informes.`);
        res.status(200).json(informesCompletos);
    } catch (error) {
        console.error('Error al obtener los informes de estadísticas:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener los informes de estadísticas.' });
    }
};

// 3. OBTENER UN INFORME DE ESTADÍSTICAS POR ID
informesCtl.getReportById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[INFORMES_ESTADISTICAS] Solicitud de obtención de informe por ID: ${id}`);

    try {
        // Usar SQL directo para obtener el informe por ID
        const [informeSQL] = await sql.promise().query(
            `SELECT 
                ie.id, 
                ie.presionesBotonPanicoId, 
                ie.numero_notificaciones,
                ie.numero_respuestas,
                ie.evaluaciones_SOS,
                ie.evaluaciones_911,
                ie.evaluaciones_innecesaria,
                ie.estado,
                ie.fecha_creacion, 
                ie.fecha_modificacion,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                informes_estadisticas ie
            JOIN 
                presiones_boton_panicos pbp ON ie.presionesBotonPanicoId = pbp.id
            JOIN
                clientes c ON pbp.clienteId = c.id
            WHERE 
                ie.id = ? AND ie.estado = 'activo'`, 
            [id]
        );
        
        if (informeSQL.length === 0) {
            logger.warn(`[INFORMES_ESTADISTICAS] Informe no encontrado o eliminado con ID: ${id}.`);
            return res.status(404).json({ error: 'Informe no encontrado o eliminado.' });
        }
        
        const informe = informeSQL[0];
        logger.info(`[INFORMES_ESTADISTICAS] Informe encontrado con ID: ${id}.`);

        res.status(200).json({
            id: informe.id,
            presionesBotonPanicoId: informe.presionesBotonPanicoId,
            numero_notificaciones: informe.numero_notificaciones,
            numero_respuestas: informe.numero_respuestas,
            evaluaciones_SOS: informe.evaluaciones_SOS,
            evaluaciones_911: informe.evaluaciones_911,
            evaluaciones_innecesaria: informe.evaluaciones_innecesaria,
            estado: informe.estado,
            fecha_creacion: informe.fecha_creacion,
            fecha_modificacion: informe.fecha_modificacion,
            presion_info: {
                marca_tiempo: informe.presion_marca_tiempo
            },
            cliente_info: {
                nombre: safeDecrypt(informe.cliente_nombre),
                correo_electronico: safeDecrypt(informe.cliente_correo)
            }
        });
    } catch (error) {
        console.error('Error al obtener el informe de estadísticas:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener el informe de estadísticas.' });
    }
};

// 4. ACTUALIZAR UN INFORME DE ESTADÍSTICAS
informesCtl.updateReport = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { 
        numero_notificaciones,
        numero_respuestas,
        evaluaciones_SOS,
        evaluaciones_911,
        evaluaciones_innecesaria,
        estado 
    } = req.body; 
    logger.info(`[INFORMES_ESTADISTICAS] Solicitud de actualización de informe con ID: ${id}`);

    try {
        // Verificar si el informe existe y está activo
        const [existingReportSQL] = await sql.promise().query("SELECT * FROM informes_estadisticas WHERE id = ? AND estado = 'activo'", [id]);
        if (existingReportSQL.length === 0) {
            logger.warn(`[INFORMES_ESTADISTICAS] Informe no encontrado o inactivo para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Informe no encontrado o inactivo para actualizar.' });
        }
        
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar datos para SQL
        const camposSQL = [];
        const valoresSQL = [];
        
        if (numero_notificaciones !== undefined) {
            camposSQL.push('numero_notificaciones = ?');
            valoresSQL.push(numero_notificaciones);
        }
        if (numero_respuestas !== undefined) {
            camposSQL.push('numero_respuestas = ?');
            valoresSQL.push(numero_respuestas);
        }
        if (evaluaciones_SOS !== undefined) {
            camposSQL.push('evaluaciones_SOS = ?');
            valoresSQL.push(evaluaciones_SOS);
        }
        if (evaluaciones_911 !== undefined) {
            camposSQL.push('evaluaciones_911 = ?');
            valoresSQL.push(evaluaciones_911);
        }
        if (evaluaciones_innecesaria !== undefined) {
            camposSQL.push('evaluaciones_innecesaria = ?');
            valoresSQL.push(evaluaciones_innecesaria);
        }
        if (estado !== undefined) {
            camposSQL.push('estado = ?');
            valoresSQL.push(estado);
        }

        if (camposSQL.length === 0) {
            logger.warn(`[INFORMES_ESTADISTICAS] No se proporcionaron campos para actualizar el informe con ID: ${id}.`);
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        valoresSQL.push(id); // Para el WHERE
        const consultaSQL = `UPDATE informes_estadisticas SET ${camposSQL.join(', ')}, fecha_modificacion = ? WHERE id = ?`; // CAMBIO: Usar formattedNow
        const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, [...valoresSQL, formattedNow, id]); // CAMBIO: Pasar formattedNow
        
        if (resultadoSQLUpdate.affectedRows === 0) {
            logger.warn(`[INFORMES_ESTADISTICAS] No se pudo actualizar el informe SQL con ID: ${id}.`);
        } else {
            logger.info(`[INFORMES_ESTADISTICAS] Informe SQL actualizado con ID: ${id}`);
        }
        
        // Obtener el informe actualizado para la respuesta
        const [updatedReportSQL] = await sql.promise().query(
            `SELECT 
                ie.id, 
                ie.presionesBotonPanicoId, 
                ie.numero_notificaciones,
                ie.numero_respuestas,
                ie.evaluaciones_SOS,
                ie.evaluaciones_911,
                ie.evaluaciones_innecesaria,
                ie.estado,
                ie.fecha_creacion, 
                ie.fecha_modificacion,
                pbp.marca_tiempo AS presion_marca_tiempo,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                informes_estadisticas ie
            JOIN 
                presiones_boton_panicos pbp ON ie.presionesBotonPanicoId = pbp.id
            JOIN
                clientes c ON pbp.clienteId = c.id
            WHERE 
                ie.id = ?`, 
            [id]
        );
        const updatedReport = updatedReportSQL[0];

        res.status(200).json({ 
            message: 'Informe de estadísticas actualizado correctamente.',
            informe: {
                id: updatedReport.id,
                presionesBotonPanicoId: updatedReport.presionesBotonPanicoId,
                numero_notificaciones: updatedReport.numero_notificaciones,
                numero_respuestas: updatedReport.numero_respuestas,
                evaluaciones_SOS: updatedReport.evaluaciones_SOS,
                evaluaciones_911: updatedReport.evaluaciones_911,
                evaluaciones_innecesaria: updatedReport.evaluaciones_innecesaria,
                estado: updatedReport.estado,
                fecha_creacion: updatedReport.fecha_creacion,
                fecha_modificacion: updatedReport.fecha_modificacion,
                presion_info: {
                    marca_tiempo: updatedReport.presion_marca_tiempo
                },
                cliente_info: {
                    nombre: safeDecrypt(updatedReport.cliente_nombre),
                    correo_electronico: safeDecrypt(updatedReport.cliente_correo)
                }
            }
        });

    } catch (error) {
        console.error('Error al actualizar el informe de estadísticas:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el informe de estadísticas.' });
    }
};

// 5. ELIMINAR UN INFORME DE ESTADÍSTICAS (Borrado Lógico)
informesCtl.deleteReport = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[INFORMES_ESTADISTICAS] Solicitud de eliminación lógica de informe con ID: ${id}`);

    try {
        // Verificar si el informe existe y está activo
        const [existingReportSQL] = await sql.promise().query("SELECT id FROM informes_estadisticas WHERE id = ? AND estado = 'activo'", [id]);
        if (existingReportSQL.length === 0) {
            logger.warn(`[INFORMES_ESTADISTICAS] Informe no encontrado o ya eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Informe no encontrado o ya estaba eliminado.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado en SQL directo
        const [resultadoSQL] = await sql.promise().query("UPDATE informes_estadisticas SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.error(`[INFORMES_ESTADISTICAS] No se pudo marcar como eliminado el informe con ID: ${id}.`);
            return res.status(500).json({ error: 'No se pudo eliminar el informe de estadísticas.' });
        }

        logger.info(`[INFORMES_ESTADISTICAS] Informe marcado como eliminado: id=${id}.`);
        res.status(200).json({ message: 'Informe marcado como eliminado correctamente.' });
    } catch (error) {
        console.error('Error al borrar el informe de estadísticas:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al borrar el informe de estadísticas.' });
    }
};

module.exports = informesCtl;
