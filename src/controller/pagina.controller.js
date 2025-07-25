// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../Database/dataBase.sql'); // MySQL directo
const mongo = require('../Database/dataBase.mongo'); // Para Mongoose (MongoDB)
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Asumiendo que usas cifrado para algunos campos

const paginaCtl = {};

// --- Utilidad para Descifrado Seguro (si aplicas cifrado a campos de página) ---
// Adapta esta función si los campos de tu página en SQL o Mongo están cifrados
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

async function getSinglePaginaSql() {
    // Utiliza SQL directo para obtener el primer registro activo de la tabla 'paginas'
    const [paginas] = await sql.promise().query("SELECT * FROM paginas WHERE estado = 'activo' LIMIT 1");
    return paginas.length > 0 ? paginas[0] : null;
}

async function getSingleContenidoPaginaMongo(idPaginaSql) {
    // Asegurarse de que el idPaginaSql sea String para la búsqueda en MongoDB
    return await mongo.ContenidoPagina.findOne({ idPaginaSql: String(idPaginaSql) });
}

// --- CRUD de Página (Combinando SQL y MongoDB) ---

// 1. OBTENER LA CONFIGURACIÓN DE LA PÁGINA (GET /pagina/listar o GET /pagina/detalle/:id)
paginaCtl.getPagina = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[PAGINA] Solicitud de obtención de configuración de página. ID: ${req.params.id || 'único'}`);

    try {
        let paginaSql;
        let contenidoPaginaMongo;

        // Si se proporciona un ID, buscar por ID en SQL usando SQL directo
        if (req.params.id) {
            const [paginas] = await sql.promise().query("SELECT * FROM paginas WHERE id = ? AND estado = 'activo'", [req.params.id]);
            paginaSql = paginas.length > 0 ? paginas[0] : null;
        } else {
            // Si no hay ID, obtener la configuración única de la página usando la función auxiliar
            paginaSql = await getSinglePaginaSql();
        }

        if (!paginaSql) {
            logger.warn(`[PAGINA] Configuración de página no encontrada. ID: ${req.params.id || 'único'}`);
            return res.status(404).json({ error: 'Configuración de página no encontrada.' });
        }
        logger.info(`[PAGINA] Configuración SQL encontrada con ID: ${paginaSql.id}`);

        // SOLO si se encuentra un registro en SQL, intentamos buscar en Mongo
        contenidoPaginaMongo = await getSingleContenidoPaginaMongo(paginaSql.id);
        if (!contenidoPaginaMongo) {
            logger.warn(`[PAGINA] Contenido Mongo no encontrado para ID SQL: ${paginaSql.id}. Devolviendo datos solo de SQL.`);
        } else {
            logger.info(`[PAGINA] Contenido Mongo encontrado para ID SQL: ${paginaSql.id}`);
        }

        const paginaCompleta = {
            id: paginaSql.id,
            nombrePagina: safeDecrypt(paginaSql.nombrePagina), // Descifrar nombrePagina
            descripcionPagina: safeDecrypt(paginaSql.descripcionPagina), // Descifrar descripcionPagina
            estado_sql: paginaSql.estado, // Estado desde SQL
            fecha_creacion_sql: paginaSql.fecha_creacion,
            fecha_modificacion_sql: paginaSql.fecha_modificacion,
            
            // Campos de MongoDB
            mision: contenidoPaginaMongo ? contenidoPaginaMongo.mision : null,
            vision: contenidoPaginaMongo ? contenidoPaginaMongo.vision : null,
            logoUrl: contenidoPaginaMongo ? contenidoPaginaMongo.logoUrl : null,
            estado_mongo: contenidoPaginaMongo ? contenidoPaginaMongo.estado : null, // Estado desde MongoDB
            fecha_creacion_mongo: contenidoPaginaMongo ? contenidoPaginaMongo.fecha_creacion : null,
            fecha_modificacion_mongo: contenidoPaginaMongo ? contenidoPaginaMongo.fecha_modificacion : null,
        };

        logger.info(`[PAGINA] Configuración de página devuelta exitosamente. ID: ${paginaSql.id}`);
        res.status(200).json(paginaCompleta);
    } catch (error) {
        logger.error(`[PAGINA] Error al obtener la configuración de la página: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. CREAR/INICIALIZAR LA CONFIGURACIÓN DE LA PÁGINA (POST /pagina/crear)
paginaCtl.createPagina = async (req, res) => {
    const logger = getLogger(req);
    const { nombrePagina, descripcionPagina, mision, vision, logoUrl } = req.body;
    logger.info('[PAGINA] Solicitud de creación de configuración de página.');

    try {
        // Verificar si ya existe una configuración de página en SQL usando la función auxiliar
        const existingPaginaSql = await getSinglePaginaSql();
        if (existingPaginaSql) {
            logger.warn('[PAGINA] Intento de crear configuración de página cuando ya existe una activa.');
            return res.status(409).json({ error: 'La configuración de la página ya existe. Utilice PUT para actualizar.' });
        }

        // **Validación de unicidad para nombrePagina al crear**
        const [existingPaginaNames] = await sql.promise().query("SELECT nombrePagina FROM paginas WHERE estado = 'activo'");
        const isPaginaNameTaken = existingPaginaNames.some(pagina => safeDecrypt(pagina.nombrePagina) === nombrePagina);

        if (isPaginaNameTaken) {
            logger.warn(`[PAGINA] Creación fallida: El nombre de página "${nombrePagina}" ya existe.`);
            return res.status(409).json({ message: 'El nombre de página ya está registrado.' });
        }


        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Cifrar nombrePagina y descripcionPagina antes de guardar en SQL
        const nombrePaginaCifrado = cifrarDato(nombrePagina);
        const descripcionPaginaCifrada = cifrarDato(descripcionPagina);

        // Crear registro en SQL usando ORM (orm.pagina.create())
        // fecha_modificacion NO se incluye en la creación, se actualizará en modificaciones
        const nuevoPaginaSQL = {
            nombrePagina: nombrePaginaCifrado,
            descripcionPagina: descripcionPaginaCifrada,
            estado: 'activo',
            fecha_creacion: formattedNow, // (hora local formateada)
        };
        const paginaGuardadaSQL = await orm.pagina.create(nuevoPaginaSQL); // Usando ORM para crear
        const idPaginaSql = paginaGuardadaSQL.id; // Obtener el ID insertado por ORM
        logger.info(`[PAGINA] Registro SQL de página creado exitosamente con ID: ${idPaginaSql} usando ORM.`);

        // Crear registro en MongoDB, vinculándolo con el ID de SQL
        // fecha_creacion se establece, fecha_modificacion no se incluye en la creación inicial
        await mongo.ContenidoPagina.create({
            idPaginaSql: String(idPaginaSql), // Asegurarse de que sea String para MongoDB
            mision,
            vision,
            logoUrl,
            estado: 'activo', // Estado inicial
            fecha_creacion: formattedNow // Establecer fecha_creacion para Mongo (hora local formateada)
        });
        logger.info(`[PAGINA] Documento Mongo de contenido de página creado exitosamente para ID SQL: ${idPaginaSql}`);

        res.status(201).json({ message: 'Configuración de página creada exitosamente.', id: idPaginaSql });
    } catch (error) {
        logger.error(`[PAGINA] Error al crear la configuración de la página: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER DETALLES DE PÁGINA POR ID (GET /pagina/detalle/:id)
// Esta función es un alias de getPagina, ya que getPagina maneja la búsqueda por ID
paginaCtl.getPaginaById = paginaCtl.getPagina;


// 4. ACTUALIZAR LA CONFIGURACIÓN DE LA PÁGINA (PUT /pagina/actualizar/:id)
paginaCtl.updatePagina = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params; // ID de la página SQL a actualizar
    const { nombrePagina, descripcionPagina, mision, vision, logoUrl, estado } = req.body;
    logger.info(`[PAGINA] Solicitud de actualización de configuración de página con ID: ${id}`);

    try {
        // Verificar si la página existe en SQL usando SQL directo
        const [existingPaginas] = await sql.promise().query("SELECT * FROM paginas WHERE id = ?", [id]);
        if (existingPaginas.length === 0) {
            logger.warn(`[PAGINA] Configuración de página no encontrada en SQL para actualizar. ID: ${id}`);
            return res.status(404).json({ error: 'Configuración de página no encontrada en SQL para actualizar.' });
        }
        logger.info(`[PAGINA] Configuración SQL encontrada para actualizar. ID: ${id}`);

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar datos para SQL (solo los que no son undefined)
        const camposSql = [];
        const valoresSql = [];
        if (nombrePagina !== undefined) {
            // **Validación de unicidad para nombrePagina al actualizar**
            const [allOtherPaginasSQL] = await sql.promise().query("SELECT id, nombrePagina FROM paginas WHERE id != ? AND estado = 'activo'", [id]);
            const isPaginaNameTaken = allOtherPaginasSQL.some(pagina => safeDecrypt(pagina.nombrePagina) === nombrePagina);

            if (isPaginaNameTaken) {
                logger.warn(`[PAGINA] Actualización fallida: El nuevo nombre de página "${nombrePagina}" ya está registrado por otra página.`);
                return res.status(409).json({ message: 'El nuevo nombre de página ya está registrado por otra página.' });
            }
            camposSql.push('nombrePagina = ?');
            valoresSql.push(cifrarDato(nombrePagina)); // Cifrar nombrePagina al actualizar
        }
        if (descripcionPagina !== undefined) {
            camposSql.push('descripcionPagina = ?');
            valoresSql.push(cifrarDato(descripcionPagina)); // Cifrar descripcionPagina al actualizar
        }
        if (estado !== undefined) {
            camposSql.push('estado = ?');
            valoresSql.push(estado);
        }

        // Actualizar registro en SQL usando SQL directo
        if (camposSql.length > 0) {
            camposSql.push('fecha_modificacion = ?'); // Agrega fecha_modificacion al final
            valoresSql.push(formattedNow);            // Agrega el valor de fecha_modificacion
            const consultaSQL = `UPDATE paginas SET ${camposSql.join(', ')} WHERE id = ?`;
            valoresSql.push(id);                      // Agrega el id al final para el WHERE
            const [resultadoSql] = await sql.promise().query(consultaSQL, valoresSql);
            if (resultadoSql.affectedRows === 0) {
                logger.warn(`[PAGINA] No se pudo actualizar la página SQL con ID: ${id}.`);
            } else {
                logger.info(`[PAGINA] Configuración SQL actualizada con ID: ${id}`);
            }
        }
        
        // Preparar datos para MongoDB (solo los que no son undefined)
        const datosParaMongo = {};
        if (mision !== undefined) datosParaMongo.mision = mision;
        if (vision !== undefined) datosParaMongo.vision = vision;
        if (logoUrl !== undefined) datosParaMongo.logoUrl = logoUrl;
        if (estado !== undefined) datosParaMongo.estado = estado; // También actualizar estado en Mongo

        // Siempre actualizar fecha_modificacion en Mongo
        datosParaMongo.fecha_modificacion = formattedNow; // CAMBIO: Usar formattedNow

        // Actualizar o crear registro en MongoDB (upsert)
        await mongo.ContenidoPagina.findOneAndUpdate(
            { idPaginaSql: String(id) }, // Buscar por el ID de SQL
            { $set: datosParaMongo }, // Campos a actualizar
            { upsert: true, new: true, setDefaultsOnInsert: true } // Crear si no existe, devolver el nuevo doc
        );
        logger.info(`[PAGINA] Documento Mongo de contenido de página actualizado para ID SQL: ${id}`);

        res.status(200).json({ message: 'Configuración de página actualizada exitosamente.' });
    } catch (error) {
        logger.error(`[PAGINA] Error al actualizar la configuración de la página: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ELIMINAR (BORRADO LÓGICO) LA CONFIGURACIÓN DE LA PÁGINA (DELETE /pagina/eliminar/:id)
paginaCtl.deletePagina = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params; // ID de la página SQL a eliminar
    logger.info(`[PAGINA] Solicitud de eliminación lógica de configuración de página con ID: ${id}`);

    try {
        // Verificar si la página existe en SQL usando SQL directo
        const [existingPaginas] = await sql.promise().query("SELECT * FROM paginas WHERE id = ?", [id]);
        if (existingPaginas.length === 0) {
            logger.warn(`[PAGINA] Configuración de página no encontrada para eliminar. ID: ${id}`);
            return res.status(404).json({ error: 'Configuración de página no encontrada para eliminar.' });
        }
        logger.info(`[PAGINA] Configuración SQL encontrada para eliminación. ID: ${id}`);

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado en SQL usando SQL directo
        const [resultadoSql] = await sql.promise().query("UPDATE paginas SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
        if (resultadoSql.affectedRows === 0) {
            logger.warn(`[PAGINA] No se pudo marcar como eliminado en SQL (posiblemente ya eliminado o ID incorrecto). ID: ${id}`);
            return res.status(404).json({ error: 'No se pudo marcar como eliminado en SQL (posiblemente ya eliminado o ID incorrecto).' });
        }
        logger.info(`[PAGINA] Configuración SQL marcada como eliminada con ID: ${id}`);

        // Marcar como eliminado en MongoDB
        await mongo.ContenidoPagina.updateOne(
            { idPaginaSql: String(id) },
            { $set: { estado: 'eliminado', fecha_modificacion: formattedNow } }
        );
        logger.info(`[PAGINA] Documento Mongo de contenido de página marcado como eliminado para ID SQL: ${id}`);

        res.status(200).json({ message: 'Configuración de página marcada como eliminada.' });
    } catch (error) {
        logger.error(`[PAGINA] Error al eliminar la configuración de la página: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = paginaCtl;
