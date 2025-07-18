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
            return res.status(404).json({ error: 'Configuración de página no encontrada.' });
        }

        // Obtener el contenido de MongoDB asociado
        contenidoPaginaMongo = await getSingleContenidoPaginaMongo(paginaSql.id);

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

        res.status(200).json(paginaCompleta);
    } catch (error) {
        console.error('Error al obtener la configuración de la página:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. CREAR/INICIALIZAR LA CONFIGURACIÓN DE LA PÁGINA (POST /pagina/crear)
paginaCtl.createPagina = async (req, res) => {
    const { nombrePagina, descripcionPagina, mision, vision, logoUrl } = req.body;
    try {
        // Verificar si ya existe una configuración de página en SQL usando la función auxiliar
        const existingPaginaSql = await getSinglePaginaSql();
        if (existingPaginaSql) {
            return res.status(409).json({ error: 'La configuración de la página ya existe. Utilice PUT para actualizar.' });
        }

        // Cifrar nombrePagina y descripcionPagina antes de guardar en SQL
        const nombrePaginaCifrado = cifrarDato(nombrePagina);
        const descripcionPaginaCifrada = cifrarDato(descripcionPagina);

        // Crear registro en SQL usando SQL directo (consistente con otros controladores)
        const [resultadoSQL] = await sql.promise().query(
            "INSERT INTO paginas (nombrePagina, descripcionPagina, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [nombrePaginaCifrado, descripcionPaginaCifrada, 'activo'] // Usar valores cifrados
        );
        const idPaginaSql = resultadoSQL.insertId;

        // Crear registro en MongoDB, vinculándolo con el ID de SQL
        const nuevoContenidoPaginaMongo = await mongo.ContenidoPagina.create({
            idPaginaSql: String(idPaginaSql), // Asegurarse de que sea String para MongoDB
            mision,
            vision,
            logoUrl,
            estado: 'activo' // Estado inicial
        });

        res.status(201).json({ message: 'Configuración de página creada exitosamente.', id: idPaginaSql });
    } catch (error) {
        console.error('Error al crear la configuración de la página:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER DETALLES DE PÁGINA POR ID (GET /pagina/detalle/:id)
// Esta función es un alias de getPagina, ya que getPagina maneja la búsqueda por ID
paginaCtl.getPaginaById = paginaCtl.getPagina;


// 4. ACTUALIZAR LA CONFIGURACIÓN DE LA PÁGINA (PUT /pagina/actualizar/:id)
paginaCtl.updatePagina = async (req, res) => {
    const { id } = req.params; // ID de la página SQL a actualizar
    const { nombrePagina, descripcionPagina, mision, vision, logoUrl, estado } = req.body;
    try {
        // Verificar si la página existe en SQL usando SQL directo
        const [existingPaginas] = await sql.promise().query("SELECT * FROM paginas WHERE id = ?", [id]);
        if (existingPaginas.length === 0) {
            return res.status(404).json({ error: 'Configuración de página no encontrada en SQL para actualizar.' });
        }

        // Preparar datos para SQL (solo los que no son undefined)
        const camposSql = [];
        const valoresSql = [];
        if (nombrePagina !== undefined) {
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
            valoresSql.push(id); // Para el WHERE
            const consultaSQL = `UPDATE paginas SET ${camposSql.join(', ')}, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?`;
            const [resultadoSql] = await sql.promise().query(consultaSQL, valoresSql);
            if (resultadoSql.affectedRows === 0) {
                // Esto podría ocurrir si el ID existe pero no se pudo actualizar por alguna razón
                console.warn(`No se pudo actualizar la página SQL con ID: ${id}`);
            }
        }
        
        // Preparar datos para MongoDB (solo los que no son undefined)
        const datosParaMongo = {};
        if (mision !== undefined) datosParaMongo.mision = mision;
        if (vision !== undefined) datosParaMongo.vision = vision;
        if (logoUrl !== undefined) datosParaMongo.logoUrl = logoUrl;
        if (estado !== undefined) datosParaMongo.estado = estado; // También actualizar estado en Mongo

        // Actualizar o crear registro en MongoDB (upsert)
        const updatedContenidoPaginaMongo = await mongo.ContenidoPagina.findOneAndUpdate(
            { idPaginaSql: String(id) }, // Buscar por el ID de SQL
            { $set: datosParaMongo }, // Campos a actualizar
            { upsert: true, new: true, setDefaultsOnInsert: true } // Crear si no existe, devolver el nuevo doc
        );

        res.status(200).json({ message: 'Configuración de página actualizada exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar la configuración de la página:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ELIMINAR (BORRADO LÓGICO) LA CONFIGURACIÓN DE LA PÁGINA (DELETE /pagina/eliminar/:id)
paginaCtl.deletePagina = async (req, res) => {
    const { id } = req.params; // ID de la página SQL a eliminar
    try {
        // Verificar si la página existe en SQL usando SQL directo
        const [existingPaginas] = await sql.promise().query("SELECT * FROM paginas WHERE id = ?", [id]);
        if (existingPaginas.length === 0) {
            return res.status(404).json({ error: 'Configuración de página no encontrada para eliminar.' });
        }

        // Marcar como eliminado en SQL usando SQL directo
        const [resultadoSql] = await sql.promise().query("UPDATE paginas SET estado = 'eliminado' WHERE id = ?", [id]);
        
        if (resultadoSql.affectedRows === 0) {
            return res.status(404).json({ error: 'No se pudo marcar como eliminado en SQL (posiblemente ya eliminado o ID incorrecto).' });
        }

        // Marcar como eliminado en MongoDB
        await mongo.ContenidoPagina.updateOne(
            { idPaginaSql: String(id) },
            { $set: { estado: 'eliminado' } }
        );

        res.status(200).json({ message: 'Configuración de página marcada como eliminada.' });
    } catch (error) {
        console.error('Error al eliminar la configuración de la página:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = paginaCtl;
