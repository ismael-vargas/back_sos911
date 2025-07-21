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

// Función auxiliar para obtener el registro SQL de contenido de la app (asumiendo uno único)
async function getSingleContenidoAppSql() {
    const [contenido] = await sql.promise().query("SELECT * FROM contenido_apps WHERE estado = 'activo' LIMIT 1");
    return contenido.length > 0 ? contenido[0] : null;
}

// Función auxiliar para obtener el registro Mongo de contenido de la app
async function getSingleContenidoAppMongo(idContenidoAppSql) {
    return await mongo.ContenidoApp.findOne({ idContenidoAppSql: String(idContenidoAppSql) });
}

// 1. OBTENER EL CONTENIDO GLOBAL (GET /contenido_app/obtener)
contenidoAppCtl.getContent = async (req, res) => {
    const logger = getLogger(req);
    logger.info('[CONTENIDO_APP] Solicitud de obtención del contenido global.');

    try {
        let contenidoSql = await getSingleContenidoAppSql();
        let contenidoMongo;

        if (!contenidoSql) {
            logger.info('[CONTENIDO_APP] No se encontró contenido SQL, creando registro por defecto.');
            const now = new Date();
            // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
            const formattedNow = formatLocalDateTime(now);
            // Usar ORM para crear el registro por defecto en SQL
            // CORREGIDO: Se cambió 'orm.contenido_apps' a 'orm.contenido_app' para coincidir con la exportación del ORM
            const nuevoContenidoSQL = await orm.contenido_app.create({
                gradientStart: '#026b6b',
                gradientEnd: '#2D353C',
                fontFamily: 'Open Sans',
                mainTitle: 'Un toque para tu seguridad',
                estado: 'activo',
                fecha_creacion: formattedNow, // (hora local formateada)
            });
            contenidoSql = nuevoContenidoSQL; // El ORM devuelve el objeto creado
        }

        contenidoMongo = await getSingleContenidoAppMongo(contenidoSql.id);

        if (!contenidoMongo) {
            logger.info('[CONTENIDO_APP] No se encontró contenido Mongo, creando registro por defecto.');
            const now = new Date();
            // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
            const formattedNow = formatLocalDateTime(now);
            // Crear con campos individuales por defecto
            contenidoMongo = await mongo.ContenidoApp.create({
                idContenidoAppSql: String(contenidoSql.id),
                howItWorksKey: 'howItWorks',
                howItWorksTitle: '¿Cómo funciona?',
                howItWorksContent: 'Contenido por defecto de cómo funciona.',
                missionKey: 'mission',
                missionTitle: 'Misión',
                missionContent: 'Contenido por defecto de misión.',
                visionKey: 'vision',
                visionTitle: 'Visión',
                visionContent: 'Contenido por defecto de visión.',
                logoApp: 'https://placehold.co/150x50/cccccc/ffffff?text=LogoApp',
                estado: 'activo',
                fecha_creacion: formattedNow // (hora local formateada)
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
            
            // Devolver los campos individuales de Mongoose
            howItWorksKey: contenidoMongo.howItWorksKey,
            howItWorksTitle: contenidoMongo.howItWorksTitle,
            howItWorksContent: contenidoMongo.howItWorksContent,
            missionKey: contenidoMongo.missionKey,
            missionTitle: contenidoMongo.missionTitle,
            missionContent: contenidoMongo.missionContent,
            visionKey: contenidoMongo.visionKey,
            visionTitle: contenidoMongo.visionTitle,
            visionContent: contenidoMongo.visionContent,
            logoApp: contenidoMongo.logoApp,
            estado_mongo: contenidoMongo.estado,
            fecha_creacion_mongo: contenidoMongo.fecha_creacion,
            fecha_modificacion_mongo: contenidoMongo.fecha_modificacion,
        };

        logger.info(`[CONTENIDO_APP] Configuración de página devuelta exitosamente. ID: ${contenidoSql.id}`);
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
    // Extraemos todos los campos individuales esperados del body
    const { 
        gradientStart, gradientEnd, fontFamily, mainTitle, 
        howItWorksKey, howItWorksTitle, howItWorksContent,
        missionKey, missionTitle, missionContent,
        visionKey, visionTitle, visionContent,
        logoApp, estado 
    } = req.body; 
    logger.info('[CONTENIDO_APP] Solicitud de creación inicial de contenido global.');

    try {
        const existingContentSql = await getSingleContenidoAppSql();
        if (existingContentSql) {
            logger.warn('[CONTENIDO_APP] Intento de crear contenido global cuando ya existe uno activo.');
            return res.status(409).json({ message: 'La configuración de contenido global ya existe. Utilice PUT para actualizar.' });
        }

        const now = new Date();
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Crear registro en SQL usando ORM (como usuario.controller.js)
        // CORREGIDO: Se cambió 'orm.contenido_apps' a 'orm.contenido_app' para coincidir con la exportación del ORM
        const nuevoContenidoSQL = await orm.contenido_app.create({
            gradientStart: gradientStart || '#026b6b', 
            gradientEnd: gradientEnd || '#2D353C', 
            fontFamily: fontFamily || 'Open Sans', 
            mainTitle: mainTitle || 'Un toque para tu seguridad', 
            estado: estado || 'activo',
            fecha_creacion: formattedNow // (hora local formateada)
        });
        const idContenidoAppSql = nuevoContenidoSQL.id; // Obtener el ID insertado por ORM
        logger.info(`[CONTENIDO_APP] Contenido SQL creado exitosamente con ID: ${idContenidoAppSql}`);

        // Crear registro en MongoDB con los campos individuales
        await mongo.ContenidoApp.create({
            idContenidoAppSql: String(idContenidoAppSql),
            howItWorksKey: howItWorksKey || 'howItWorks',
            howItWorksTitle: howItWorksTitle || '¿Cómo funciona?',
            howItWorksContent: howItWorksContent || 'Contenido por defecto de cómo funciona.',
            missionKey: missionKey || 'mission',
            missionTitle: missionTitle || 'Misión',
            missionContent: missionContent || 'Contenido por defecto de misión.',
            visionKey: visionKey || 'vision',
            visionTitle: visionTitle || 'Visión',
            visionContent: visionContent || 'Contenido por defecto de visión.',
            logoApp: logoApp || 'https://placehold.co/150x50/cccccc/ffffff?text=LogoApp',
            estado: estado || 'activo',
            fecha_creacion: formattedNow // (hora local formateada)
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
    const { 
        gradientStart, gradientEnd, fontFamily, mainTitle, 
        howItWorksKey, howItWorksTitle, howItWorksContent,
        missionKey, missionTitle, missionContent,
        visionKey, visionTitle, visionContent,
        logoApp, estado 
    } = req.body; 
    logger.info('[CONTENIDO_APP] Solicitud de actualización del contenido global.');

    try {
        let contenidoSql = await getSingleContenidoAppSql();
        if (!contenidoSql) {
            logger.warn('[CONTENIDO_APP] Contenido SQL no encontrado para actualizar. Se intentará crear si no existe.');
            return res.status(404).json({ message: 'Contenido no encontrado para actualizar. Considere usar POST /crear primero.' });
        }

        const now = new Date();
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar datos para SQL
        const camposSql = [];
        const valoresSql = [];
        if (gradientStart !== undefined) { camposSql.push('gradientStart = ?'); valoresSql.push(gradientStart); }
        if (gradientEnd !== undefined) { camposSql.push('gradientEnd = ?'); valoresSql.push(gradientEnd); }
        if (fontFamily !== undefined) { camposSql.push('fontFamily = ?'); valoresSql.push(fontFamily); }
        if (mainTitle !== undefined) { camposSql.push('mainTitle = ?'); valoresSql.push(mainTitle); }
        if (estado !== undefined) { camposSql.push('estado = ?'); valoresSql.push(estado); }

        // Actualizar registro en SQL
        if (camposSql.length > 0) {
            await sql.promise().query(
                `UPDATE contenido_apps SET ${camposSql.join(', ')}, fecha_modificacion = ? WHERE id = ?`, // CAMBIO: Usar formattedNow
                [...valoresSql, formattedNow, contenidoSql.id] // CAMBIO: Pasar formattedNow
            );
            logger.info(`[CONTENIDO_APP] Contenido SQL actualizado para ID: ${contenidoSql.id}`);
        }

        // Preparar datos para MongoDB con los campos individuales
        const updateDataMongo = {};
        if (howItWorksKey !== undefined) updateDataMongo.howItWorksKey = howItWorksKey;
        if (howItWorksTitle !== undefined) updateDataMongo.howItWorksTitle = howItWorksTitle;
        if (howItWorksContent !== undefined) updateDataMongo.howItWorksContent = howItWorksContent;
        if (missionKey !== undefined) updateDataMongo.missionKey = missionKey;
        if (missionTitle !== undefined) updateDataMongo.missionTitle = missionTitle;
        if (missionContent !== undefined) updateDataMongo.missionContent = missionContent;
        if (visionKey !== undefined) updateDataMongo.visionKey = visionKey;
        if (visionTitle !== undefined) updateDataMongo.visionTitle = visionTitle;
        if (visionContent !== undefined) updateDataMongo.visionContent = visionContent;
        if (logoApp !== undefined) updateDataMongo.logoApp = logoApp;
        if (estado !== undefined) updateDataMongo.estado = estado;

        updateDataMongo.fecha_modificacion = formattedNow; // CAMBIO: Usar formattedNow

        if (Object.keys(updateDataMongo).length > 0) {
            await mongo.ContenidoApp.findOneAndUpdate(
                { idContenidoAppSql: String(contenidoSql.id) },
                { $set: updateDataMongo },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            logger.info(`[CONTENIDO_APP] Contenido Mongo actualizado para ID SQL: ${contenidoSql.id}`);
        }

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

        const now = new Date();
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        await sql.promise().query(
            "UPDATE contenido_apps SET estado = ?, fecha_modificacion = ? WHERE id = ?",
            [estado, formattedNow, contenidoSql.id] // CAMBIO: Usar formattedNow
        );
        logger.info(`[CONTENIDO_APP] Estado SQL actualizado a "${estado}" para ID: ${contenidoSql.id}`);

        await mongo.ContenidoApp.updateOne(
            { idContenidoAppSql: String(contenidoSql.id) },
            { $set: { estado: estado, fecha_modificacion: formattedNow } } // CAMBIO: Usar formattedNow
        );
        logger.info(`[CONTENIDO_APP] Estado Mongo actualizado a "${estado}" para ID SQL: ${contenidoSql.id}`);
        
        res.status(200).json({ message: 'Estado actualizado correctamente.' });
    } catch (error) {
        console.error('Error al cambiar el estado del contenido global:', error);
        res.status(500).json({ error: 'Error interno del servidor al cambiar el estado.' });
    }
};

module.exports = contenidoAppCtl;
