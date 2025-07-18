// Importa los modelos y utilidades necesarias
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../Database/dataBase.sql'); // MySQL directo
const mongo = require('../Database/dataBase.mongo'); // Para Mongoose (MongoDB)

const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Se mantiene por consistencia

const contenidoAppCtl = {};

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

// Función auxiliar para obtener el registro SQL de contenido de la app (asumiendo uno único)
async function getSingleContenidoAppSql() {
    // CORREGIDO: Usar 'contenido_apps' en la consulta SQL
    const [contenido] = await sql.promise().query("SELECT * FROM contenido_apps WHERE estado = 'activo' LIMIT 1");
    return contenido.length > 0 ? contenido[0] : null;
}

// Función auxiliar para obtener el registro Mongo de contenido de la app
async function getSingleContenidoAppMongo(idContenidoAppSql) {
    return await mongo.ContenidoAppSecciones.findOne({ idContenidoAppSql: String(idContenidoAppSql) });
}

// 1. OBTENER EL CONTENIDO GLOBAL (GET /contenido_app/obtener)
// Esta función también se encarga de crear el contenido por defecto si no existe.
contenidoAppCtl.getContent = async (req, res) => {
    const logger = getLogger(req);
    logger.info('[CONTENIDO_APP] Solicitud de obtención del contenido global.');

    try {
        let contenidoSql = await getSingleContenidoAppSql();
        let contenidoMongo;

        if (!contenidoSql) {
            // Si no existe en SQL, crear un registro por defecto en SQL
            logger.info('[CONTENIDO_APP] No se encontró contenido SQL, creando registro por defecto.');
            // CORREGIDO: Usar 'contenido_apps' en la consulta SQL
            const [resultadoSQL] = await sql.promise().query(
                "INSERT INTO contenido_apps (gradientStart, gradientEnd, fontFamily, mainTitle, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                ['#026b6b', '#2D353C', 'Open Sans', 'Un toque para tu seguridad', 'activo']
            );
            const idContenidoAppSql = resultadoSQL.insertId;
            // CORREGIDO: Usar 'contenido_apps' en la consulta SQL
            const [newContentSql] = await sql.promise().query("SELECT * FROM contenido_apps WHERE id = ?", [idContenidoAppSql]);
            contenidoSql = newContentSql[0];
        }

        contenidoMongo = await getSingleContenidoAppMongo(contenidoSql.id);

        if (!contenidoMongo) {
            // Si no existe en Mongo, crear un registro por defecto en Mongo
            logger.info('[CONTENIDO_APP] No se encontró contenido Mongo, creando registro por defecto.');
            contenidoMongo = await mongo.ContenidoAppSecciones.create({
                idContenidoAppSql: String(contenidoSql.id),
                sections: [
                    { key: 'howItWorks', title: '¿Cómo funciona?', content: '' },
                    { key: 'mission', title: 'Misión', content: '' },
                    { key: 'vision', title: 'Visión', content: '' }
                ],
                logoApp: 'https://placehold.co/150x50/cccccc/ffffff?text=LogoApp', // Valor por defecto para logoApp
                estado: 'activo'
            });
        }

        const contenidoCompleto = {
            id: contenidoSql.id,
            gradientStart: contenidoSql.gradientStart,
            gradientEnd: contenidoSql.gradientEnd,
            fontFamily: contenidoSql.fontFamily,
            mainTitle: contenidoSql.mainTitle,
            estado_sql: contenidoSql.estado,
            fecha_creacion_sql: contenidoSql.fecha_creacion,
            fecha_modificacion_sql: contenidoSql.fecha_modificacion,
            
            sections: contenidoMongo.sections,
            logoApp: contenidoMongo.logoApp, // Incluir logoApp de Mongo
            estado_mongo: contenidoMongo.estado,
            fecha_creacion_mongo: contenidoMongo.fecha_creacion,
            fecha_modificacion_mongo: contenidoMongo.fecha_modificacion,
        };

        res.status(200).json(contenidoCompleto);
    } catch (error) {
        console.error('Error al obtener o crear el contenido global de la app:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener el contenido.' });
    }
};

// NUEVO: Función para la creación inicial explícita del contenido global
// (POST /contenido_app/crear)
contenidoAppCtl.createInitialContent = async (req, res) => {
    const logger = getLogger(req);
    const { gradientStart, gradientEnd, fontFamily, mainTitle, sections, logoApp, estado } = req.body; 
    logger.info('[CONTENIDO_APP] Solicitud de creación inicial de contenido global.');

    try {
        // Verificar si ya existe un registro activo de contenido
        const existingContentSql = await getSingleContenidoAppSql();
        if (existingContentSql) {
            logger.warn('[CONTENIDO_APP] Intento de crear contenido global cuando ya existe uno activo.');
            return res.status(409).json({ message: 'La configuración de contenido global ya existe. Utilice PUT para actualizar.' });
        }

        // Crear registro en SQL
        // CORREGIDO: Usar 'contenido_apps' en la consulta SQL
        const [resultadoSQL] = await sql.promise().query(
            "INSERT INTO contenido_apps (gradientStart, gradientEnd, fontFamily, mainTitle, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [
                gradientStart || '#026b6b', 
                gradientEnd || '#2D353C', 
                fontFamily || 'Open Sans', 
                mainTitle || 'Un toque para tu seguridad', 
                estado || 'activo'
            ]
        );
        const idContenidoAppSql = resultadoSQL.insertId;
        logger.info(`[CONTENIDO_APP] Contenido SQL creado exitosamente con ID: ${idContenidoAppSql}`);

        // Crear registro en MongoDB
        await mongo.ContenidoAppSecciones.create({
            idContenidoAppSql: String(idContenidoAppSql),
            sections: sections || [], // Si no se proporcionan secciones, iniciar con un array vacío
            logoApp: logoApp || 'https://placehold.co/150x50/cccccc/ffffff?text=LogoApp',
            estado: estado || 'activo'
        });
        logger.info(`[CONTENIDO_APP] Contenido Mongo creado exitosamente para ID SQL: ${idContenidoAppSql}`);

        res.status(201).json({ message: 'Contenido global creado exitosamente.', id: idContenidoAppSql });

    } catch (error) {
        console.error('Error al crear el contenido global de la app:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear el contenido.' });
    }
};


// 2. ACTUALIZAR EL CONTENIDO GLOBAL (PUT /contenido_app/actualizar)
contenidoAppCtl.updateContent = async (req, res) => {
    const logger = getLogger(req);
    // No se usa ID en la ruta, se asume que se actualiza el único registro existente
    const { gradientStart, gradientEnd, fontFamily, mainTitle, sections, logoApp, estado } = req.body; // Añadido logoApp
    logger.info('[CONTENIDO_APP] Solicitud de actualización del contenido global.');

    try {
        let contenidoSql = await getSingleContenidoAppSql();
        if (!contenidoSql) {
            logger.warn('[CONTENIDO_APP] Contenido SQL no encontrado para actualizar. Se intentará crear si no existe.');
            // Si no existe, se intentará crear uno nuevo (comportamiento de upsert)
            // En este caso, el PUT se comporta como un POST si no hay registro.
            return res.status(404).json({ message: 'Contenido no encontrado para actualizar. Considere usar POST /crear primero.' });
        }

        // Preparar datos para SQL
        const camposSql = [];
        const valoresSql = [];
        if (gradientStart !== undefined) {
            camposSql.push('gradientStart = ?');
            valoresSql.push(gradientStart);
        }
        if (gradientEnd !== undefined) {
            camposSql.push('gradientEnd = ?');
            valoresSql.push(gradientEnd);
        }
        if (fontFamily !== undefined) {
            camposSql.push('fontFamily = ?');
            valoresSql.push(fontFamily);
        }
        if (mainTitle !== undefined) {
            camposSql.push('mainTitle = ?');
            valoresSql.push(mainTitle);
        }
        if (estado !== undefined) {
            camposSql.push('estado = ?');
            valoresSql.push(estado);
        }

        // Actualizar registro en SQL
        if (camposSql.length > 0) {
            // CORREGIDO: Usar 'contenido_apps' en la consulta SQL
            await sql.promise().query(
                `UPDATE contenido_apps SET ${camposSql.join(', ')}, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?`, 
                [...valoresSql, contenidoSql.id]
            );
            logger.info(`[CONTENIDO_APP] Contenido SQL actualizado para ID: ${contenidoSql.id}`);
        }

        // Preparar datos para MongoDB
        const updateDataMongo = {};
        if (sections !== undefined) updateDataMongo.sections = sections;
        if (logoApp !== undefined) updateDataMongo.logoApp = logoApp; // Añadir logoApp a la actualización de Mongo
        if (estado !== undefined) updateDataMongo.estado = estado; // Sincronizar estado

        // Actualizar registro en MongoDB (upsert: true crea si no existe)
        await mongo.ContenidoAppSecciones.findOneAndUpdate(
            { idContenidoAppSql: String(contenidoSql.id) },
            { $set: updateDataMongo },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        logger.info(`[CONTENIDO_APP] Contenido Mongo actualizado para ID SQL: ${contenidoSql.id}`);

        res.status(200).json({ message: 'Contenido actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el contenido global de la app:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el contenido.' });
    }
};

// 3. CAMBIAR EL ESTADO DEL CONTENIDO GLOBAL (PATCH /contenido_app/cambiar-estado)
contenidoAppCtl.changeStatus = async (req, res) => {
    const logger = getLogger(req);
    const { estado } = req.body;
    logger.info(`[CONTENIDO_APP] Solicitud de cambio de estado a: ${estado}`);

    if (!['activo', 'eliminado'].includes(estado)) {
        logger.warn('[CONTENIDO_APP] Cambio de estado fallido: Estado inválido.');
        return res.status(400).json({ message: 'Estado inválido. Debe ser "activo" o "eliminado".' });
    }

    try {
        let contenidoSql = await getSingleContenidoAppSql();
        if (!contenidoSql) {
            logger.warn('[CONTENIDO_APP] Contenido SQL no encontrado para cambiar estado.');
            return res.status(404).json({ message: 'Contenido no encontrado.' });
        }

        // Actualizar estado en SQL
        // CORREGIDO: Usar 'contenido_apps' en la consulta SQL
        await sql.promise().query(
            "UPDATE contenido_apps SET estado = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?",
            [estado, contenidoSql.id]
        );
        logger.info(`[CONTENIDO_APP] Estado SQL actualizado a "${estado}" para ID: ${contenidoSql.id}`);

        // Actualizar estado en MongoDB
        await mongo.ContenidoAppSecciones.updateOne(
            { idContenidoAppSql: String(contenidoSql.id) },
            { $set: { estado: estado }, $currentDate: { fecha_modificacion: true } }
        );
        logger.info(`[CONTENIDO_APP] Estado Mongo actualizado a "${estado}" para ID SQL: ${contenidoSql.id}`);
        
        res.status(200).json({ message: 'Estado actualizado correctamente.' });
    } catch (error) {
        console.error('Error al cambiar el estado del contenido global:', error);
        res.status(500).json({ error: 'Error interno del servidor al cambiar el estado.' });
    }
};

module.exports = contenidoAppCtl;
