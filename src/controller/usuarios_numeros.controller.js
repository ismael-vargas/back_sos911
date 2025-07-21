// Importa los modelos de ambas bases de datos (ORM y SQL directo) y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Utilidades de cifrado/descifrado

const usuarioNumeroCtl = {};

// --- Utilidad para Descifrado Seguro ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos de usuario_numero:', error.message);
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

// --- Utilidad para obtener el logger desde req.app (mantenido de tu original) ---
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// 1. CREAR UN NUEVO NÚMERO DE USUARIO (POST /usuarios_numeros/crear)
usuarioNumeroCtl.createUserNumber = async (req, res) => {
    const logger = getLogger(req);
    let { nombre, numero, usuarioId } = req.body; 
    logger.info(`[USUARIOS_NUMEROS] Intento de registro: nombre=${nombre}, numero=${numero}, usuarioId=${usuarioId}`);

    if (!nombre || !numero || !usuarioId) { 
        logger.warn('[USUARIOS_NUMEROS] Registro fallido: campos obligatorios faltantes');
        return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, numero y usuarioId.' });
    }

    try {
        // Cifrar los campos sensibles antes de guardar
        const nombreCif = cifrarDato(nombre);
        const numeroCif = cifrarDato(numero);

        // Verificar si el usuarioId existe y está activo
        const [existingUser] = await sql.promise().query("SELECT id FROM usuarios WHERE id = ? AND estado = 'activo'", [usuarioId]);
        if (existingUser.length === 0) {
            logger.warn(`[USUARIOS_NUMEROS] Creación fallida: usuario no existe o está inactivo (usuarioId=${usuarioId})`);
            return res.status(400).json({ message: 'El usuario asociado no existe o no está activo.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Usar ORM para la creación
        // Se establece fecha_creacion, y fecha_modificacion no se incluye en la creación inicial.
        const nuevoUsuarioNumero = await orm.usuario_numero.create({
            nombre: nombreCif,
            numero: numeroCif,
            usuarioId,
            estado: 'activo',
            fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
            // fecha_modificacion no se establece aquí, se actualizará en métodos de actualización/eliminación
        });

        logger.info(`[USUARIOS_NUMEROS] Registro exitoso: id=${nuevoUsuarioNumero.id}, usuarioId=${usuarioId}`);
        res.status(201).json({
            message: 'Registro exitoso',
            usuarioNumero: {
                id: nuevoUsuarioNumero.id,
                nombre: safeDecrypt(nuevoUsuarioNumero.nombre),
                numero: safeDecrypt(nuevoUsuarioNumero.numero),
                estado: nuevoUsuarioNumero.estado,
                usuarioId: nuevoUsuarioNumero.usuarioId,
                fecha_creacion: nuevoUsuarioNumero.fecha_creacion,
                fecha_modificacion: nuevoUsuarioNumero.fecha_modificacion // Puede ser null si no se ha modificado
            }
        });
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al crear el usuarioNumero: ${error.message}`);
        res.status(500).json({ error: 'Error al crear el usuarioNumero' });
    }
};

// 2. OBTENER TODOS LOS NÚMEROS DE USUARIO (GET /usuarios_numeros/listar)
usuarioNumeroCtl.getAllUserNumbers = async (req, res) => {
    const logger = getLogger(req);
    const incluirEliminados = req.query.incluirEliminados === 'true'; // Añadido para consistencia
    logger.info(`[USUARIOS_NUMEROS] Solicitud de listado de usuarios_numeros (incluirEliminados: ${incluirEliminados}).`);
    try {
        let querySQL = `SELECT 
                            un.id, 
                            un.nombre, 
                            un.numero, 
                            un.estado, 
                            un.usuarioId, 
                            u.nombre AS nombre_usuario_asociado,
                            u.correo_electronico AS correo_usuario_asociado,
                            un.fecha_creacion,
                            un.fecha_modificacion
                        FROM 
                            usuarios_numeros un
                        JOIN 
                            usuarios u ON un.usuarioId = u.id`;
        
        const params = [];
        if (!incluirEliminados) {
            querySQL += ` WHERE un.estado = 'activo'`;
        }
        querySQL += ` ORDER BY un.fecha_creacion DESC`; // Ordenar para consistencia

        const [usuariosNumerosSQL] = await sql.promise().query(querySQL, params);
        
        const usuariosNumerosCompletos = usuariosNumerosSQL.map(numSQL => ({
            id: numSQL.id,
            nombre: safeDecrypt(numSQL.nombre),
            numero: safeDecrypt(numSQL.numero),
            estado: numSQL.estado,
            usuarioId: numSQL.usuarioId,
            nombre_usuario_asociado: safeDecrypt(numSQL.nombre_usuario_asociado),
            correo_usuario_asociado: safeDecrypt(numSQL.correo_usuario_asociado),
            fecha_creacion: numSQL.fecha_creacion,
            fecha_modificacion: numSQL.fecha_modificacion
        }));

        logger.info(`[USUARIOS_NUMEROS] Se devolvieron ${usuariosNumerosCompletos.length} números de usuario.`);
        res.status(200).json(usuariosNumerosCompletos);
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al obtener los usuariosNumeros: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los usuariosNumeros' });
    }
};

// 3. OBTENER UN NÚMERO DE USUARIO POR ID (GET /usuarios_numeros/detalle/:id)
usuarioNumeroCtl.getUserNumberById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[USUARIOS_NUMEROS] Solicitud de usuario_numero por ID: ${id}`);
    try {
        const [usuarioNumeroSQL] = await sql.promise().query(
            `SELECT 
                un.id, 
                un.nombre, 
                un.numero, 
                un.estado, 
                un.usuarioId, 
                u.nombre AS nombre_usuario_asociado,
                u.correo_electronico AS correo_usuario_asociado,
                un.fecha_creacion,
                un.fecha_modificacion
            FROM 
                usuarios_numeros un
            JOIN 
                usuarios u ON un.usuarioId = u.id 
            WHERE 
                un.id = ? AND un.estado = 'activo'`, 
            [id]
        );

        if (usuarioNumeroSQL.length === 0) {
            logger.warn(`[USUARIOS_NUMEROS] Usuario_numero no encontrado: id=${id}`);
            return res.status(404).json({ error: 'Número de usuario no encontrado o inactivo.' });
        }
        
        const numSQL = usuarioNumeroSQL[0];
        const usuarioNumeroCompleto = {
            id: numSQL.id,
            nombre: safeDecrypt(numSQL.nombre),
            numero: safeDecrypt(numSQL.numero),
            estado: numSQL.estado,
            usuarioId: numSQL.usuarioId,
            nombre_usuario_asociado: safeDecrypt(numSQL.nombre_usuario_asociado),
            correo_usuario_asociado: safeDecrypt(numSQL.correo_usuario_asociado),
            fecha_creacion: numSQL.fecha_creacion,
            fecha_modificacion: numSQL.fecha_modificacion
        };

        res.status(200).json(usuarioNumeroCompleto);
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al obtener el número de usuario: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener el número de usuario' });
    }
};

// 4. ACTUALIZAR UN NÚMERO DE USUARIO POR ID (PUT /usuarios_numeros/actualizar/:id)
usuarioNumeroCtl.updateUserNumber = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { nombre, numero, estado } = req.body; // No se permite cambiar usuarioId en update
    logger.info(`[USUARIOS_NUMEROS] Actualización de usuario_numero: id=${id}`);

    try {
        // Verificar existencia y estado actual
        const [existingNum] = await sql.promise().query("SELECT * FROM usuarios_numeros WHERE id = ? AND estado = 'activo'", [id]); // Solo actualizar si está activo
        if (existingNum.length === 0) {
            logger.warn(`[USUARIOS_NUMEROS] Usuario_numero no encontrado o inactivo para actualizar: id=${id}`);
            return res.status(404).json({ error: 'Número de usuario no encontrado o inactivo.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar campos y valores para la actualización SQL
        const campos = [];
        const valores = [];

        if (nombre !== undefined) {
            campos.push('nombre = ?');
            valores.push(cifrarDato(nombre));
        }
        if (numero !== undefined) {
            campos.push('numero = ?');
            valores.push(cifrarDato(numero));
        }
        if (estado !== undefined) {
            campos.push('estado = ?');
            valores.push(estado);
        }

        if (campos.length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        // Siempre actualizar fecha_modificacion en SQL
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        valores.push(id); // Añadir el ID para la cláusula WHERE
        const consultaSQL = `UPDATE usuarios_numeros SET ${campos.join(', ')} WHERE id = ?`;
        const [resultado] = await sql.promise().query(consultaSQL, valores);

        if (resultado.affectedRows === 0) {
            logger.warn(`[USUARIOS_NUMEROS] No se pudo actualizar el usuario_numero: id=${id}`);
            return res.status(500).json({ error: 'No se pudo actualizar el número de usuario.' });
        }

        // Obtener el registro actualizado para la respuesta
        const [updatedNum] = await sql.promise().query("SELECT * FROM usuarios_numeros WHERE id = ?", [id]);
        const numActualizado = updatedNum[0];

        res.status(200).json({
            message: 'Número de usuario actualizado correctamente.',
            usuarioNumero: {
                id: numActualizado.id,
                nombre: safeDecrypt(numActualizado.nombre),
                numero: safeDecrypt(numActualizado.numero),
                estado: numActualizado.estado,
                usuarioId: numActualizado.usuarioId,
                fecha_creacion: numActualizado.fecha_creacion,
                fecha_modificacion: numActualizado.fecha_modificacion
            }
        });
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al actualizar el número de usuario: ${error.message}`);
        res.status(500).json({ error: 'Error al actualizar el número de usuario' });
    }
};

// 5. ELIMINAR UN NÚMERO DE USUARIO (Borrado Lógico) (DELETE /usuarios_numeros/eliminar/:id)
usuarioNumeroCtl.deleteUserNumber = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[USUARIOS_NUMEROS] Eliminación de usuario_numero: id=${id}`);
    try {
        // Verificar existencia y estado
        const [existingNum] = await sql.promise().query("SELECT * FROM usuarios_numeros WHERE id = ? AND estado = 'activo'", [id]); // Solo eliminar si está activo
        if (existingNum.length === 0 || existingNum[0].estado === 'eliminado') {
            logger.warn(`[USUARIOS_NUMEROS] Usuario_numero no encontrado o ya eliminado: id=${id}`);
            return res.status(404).json({ error: 'Número de usuario no encontrado o ya eliminado.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado en SQL directo
        const [resultado] = await sql.promise().query("UPDATE usuarios_numeros SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
        if (resultado.affectedRows === 0) {
            logger.error(`[USUARIOS_NUMEROS] No se pudo marcar como eliminado el usuario_numero: id=${id}`);
            return res.status(500).json({ error: 'No se pudo eliminar el número de usuario.' });
        }

        logger.info(`[USUARIOS_NUMEROS] Usuario_numero marcado como eliminado: id=${id}`);
        res.status(200).json({ message: 'Número de usuario marcado como eliminado correctamente.' });
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al borrar el número de usuario: ${error.message}`);
        res.status(500).json({ error: 'Error al borrar el número de usuario' });
    }
};

module.exports = usuarioNumeroCtl;
