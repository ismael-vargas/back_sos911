// Importa los modelos de ambas bases de datos (ORM y SQL directo) y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (ORM)
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

// --- Utilidad para obtener el logger desde req.app (mantenido de tu original) ---
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// 1. CREAR UN NUEVO NÚMERO DE USUARIO (POST /usuarios_numeros/crear)
usuarioNumeroCtl.createUserNumber = async (req, res) => {
    const logger = getLogger(req);
    // Cambiamos 'usuario_id' a 'usuarioId' para que coincida con la columna de la DB (camelCase)
    let { nombre, numero, usuarioId } = req.body; 
    logger.info(`[USUARIOS_NUMEROS] Intento de registro: nombre=${nombre}, numero=${numero}, usuarioId=${usuarioId}`); // Log actualizado

    // Validar que los campos obligatorios estén presentes
    // Ahora validamos 'usuarioId'
    if (!nombre || !numero || !usuarioId) { 
        logger.warn('[USUARIOS_NUMEROS] Registro fallido: campos obligatorios faltantes');
        return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, numero y usuarioId.' }); // Mensaje actualizado
    }

    try {
        // Cifrar los campos sensibles antes de guardar
        const nombreCif = cifrarDato(nombre);
        const numeroCif = cifrarDato(numero);

        // Usar ORM para la creación
        const nuevoUsuarioNumero = await orm.usuario_numero.create({
            nombre: nombreCif,
            numero: numeroCif,
            usuarioId, // <--- ¡USAMOS 'usuarioId' aquí para que coincida con la DB!
            estado: 'activo' // Asegurar estado inicial
        });

        // Recargar el objeto desde la base de datos para obtener los valores reales
        // de fecha_creacion y fecha_modificacion generados por MySQL,
        // y asegurar que usuarioId se incluya en el objeto toJSON().
        // Seleccionamos explícitamente usuarioId para asegurarnos de que se cargue.
        const usuarioNumeroRecargado = await orm.usuario_numero.findByPk(nuevoUsuarioNumero.id, {
            attributes: ['id', 'nombre', 'numero', 'estado', 'usuarioId', 'fecha_creacion', 'fecha_modificacion'] // <--- ¡USAMOS 'usuarioId' aquí!
        });

        logger.info(`[USUARIOS_NUMEROS] Registro exitoso: id=${usuarioNumeroRecargado.id}, usuarioId=${usuarioId}`); // Log actualizado
        res.status(201).json({
            message: 'Registro exitoso',
            usuarioNumero: {
                ...usuarioNumeroRecargado.toJSON(), // Usar el objeto recargado
                nombre: safeDecrypt(usuarioNumeroRecargado.nombre),
                numero: safeDecrypt(usuarioNumeroRecargado.numero),
                usuarioId: usuarioNumeroRecargado.usuarioId // <--- ¡USAMOS 'usuarioId' aquí en la respuesta!
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
    logger.info('[USUARIOS_NUMEROS] Solicitud de listado de usuarios_numeros');
    try {
        // Usar SQL directo para obtener usuarios_numeros y unirse con usuarios
        // Seleccionamos 'un.usuarioId' para que coincida con el nombre de la columna en la DB
        const [usuariosNumerosSQL] = await sql.promise().query(
            `SELECT 
                un.id, 
                un.nombre, 
                un.numero, 
                un.estado, 
                un.usuarioId, -- <--- ¡USAMOS 'usuarioId' aquí en la query SQL!
                u.nombre AS nombre_usuario_asociado,
                u.correo_electronico AS correo_usuario_asociado,
                un.fecha_creacion,
                un.fecha_modificacion
            FROM 
                usuarios_numeros un
            JOIN 
                usuarios u ON un.usuarioId = u.id -- <--- ¡USAMOS 'usuarioId' aquí en el JOIN!
            WHERE 
                un.estado = 'activo'`
        );
        
        // Descifrar los campos sensibles antes de enviar
        const usuariosNumerosCompletos = usuariosNumerosSQL.map(numSQL => ({
            id: numSQL.id,
            nombre: safeDecrypt(numSQL.nombre),
            numero: safeDecrypt(numSQL.numero),
            estado: numSQL.estado,
            usuarioId: numSQL.usuarioId, // <--- ¡USAMOS 'usuarioId' aquí en la respuesta!
            nombre_usuario_asociado: safeDecrypt(numSQL.nombre_usuario_asociado),
            correo_usuario_asociado: safeDecrypt(numSQL.correo_usuario_asociado),
            fecha_creacion: numSQL.fecha_creacion,
            fecha_modificacion: numSQL.fecha_modificacion
        }));

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
        // Usar SQL directo para obtener el usuario_numero por ID y unirse con usuarios
        // Seleccionamos 'un.usuarioId' para que coincida con el nombre de la columna en la DB
        const [usuarioNumeroSQL] = await sql.promise().query(
            `SELECT 
                un.id, 
                un.nombre, 
                un.numero, 
                un.estado, 
                un.usuarioId, -- <--- ¡USAMOS 'usuarioId' aquí en la query SQL!
                u.nombre AS nombre_usuario_asociado,
                u.correo_electronico AS correo_usuario_asociado,
                un.fecha_creacion,
                un.fecha_modificacion
            FROM 
                usuarios_numeros un
            JOIN 
                usuarios u ON un.usuarioId = u.id -- <--- ¡USAMOS 'usuarioId' aquí en el JOIN!
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
            usuarioId: numSQL.usuarioId, // <--- ¡USAMOS 'usuarioId' aquí en la respuesta!
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
        const [existingNum] = await sql.promise().query("SELECT * FROM usuarios_numeros WHERE id = ?", [id]);
        if (existingNum.length === 0) {
            logger.warn(`[USUARIOS_NUMEROS] Usuario_numero no encontrado para actualizar: id=${id}`);
            return res.status(404).json({ error: 'Número de usuario no encontrado.' });
        }

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
                usuarioId: numActualizado.usuarioId, // <--- Incluir 'usuarioId' en la respuesta
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
        const [existingNum] = await sql.promise().query("SELECT * FROM usuarios_numeros WHERE id = ?", [id]);
        if (existingNum.length === 0 || existingNum[0].estado === 'eliminado') {
            logger.warn(`[USUARIOS_NUMEROS] Usuario_numero no encontrado o ya eliminado: id=${id}`);
            return res.status(404).json({ error: 'Número de usuario no encontrado o ya eliminado.' });
        }

        // Marcar como eliminado en SQL directo
        const [resultado] = await sql.promise().query("UPDATE usuarios_numeros SET estado = 'eliminado' WHERE id = ?", [id]);
        
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
