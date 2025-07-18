// Importa los modelos de ambas bases de datos (ORM y SQL directo) y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (ORM)
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Utilidades de cifrado/descifrado

const rolCtl = {};

// --- Utilidad para Descifrado Seguro ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos de rol:', error.message);
        return '';
    }
}

// --- Utilidad para obtener el logger desde req.app ---
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// 1. CREAR UN NUEVO ROL (POST /roles/crear)
rolCtl.createRole = async (req, res) => {
    const logger = getLogger(req);
    let { usuarioId, nombre } = req.body; 
    logger.info(`[ROL] Intento de registro: usuarioId=${usuarioId}, nombre=${nombre}`);

    if (!usuarioId || !nombre) {
        logger.warn('[ROL] Registro fallido: campos obligatorios faltantes');
        return res.status(400).json({ message: 'Faltan campos obligatorios: usuarioId y nombre.' });
    }

    try {
        const [existingUsers] = await sql.promise().query("SELECT id FROM usuarios WHERE id = ? AND estado = 'activo'", [usuarioId]);
        if (existingUsers.length === 0) {
            logger.warn(`[ROL] Registro fallido: usuario no existe o está inactivo (usuarioId=${usuarioId})`);
            return res.status(400).json({ message: 'El usuario asociado no existe o no está activo.' });
        }

        const nombreCif = cifrarDato(nombre);

        // 1. Crear el rol
        const nuevoRol = await orm.rol.create({
            nombre: nombreCif
        });

        // 2. Crear la relación usando los nombres correctos de columnas
        await orm.usuarios_roles.create({
            usuarioId: usuarioId,  // Columna correcta
            roleId: nuevoRol.id    // Columna correcta (NO rolId)
        });

        logger.info(`[ROL] Registro exitoso: id=${nuevoRol.id}, usuarioId=${usuarioId}`);
        res.status(201).json({
            message: 'Rol registrado exitosamente.',
            rol: {
                id: nuevoRol.id,
                nombre: safeDecrypt(nuevoRol.nombre),
                estado: nuevoRol.estado,
                usuarioId: usuarioId,
                fecha_creacion: nuevoRol.fecha_creacion,
                fecha_modificacion: nuevoRol.fecha_modificacion
            }
        });
    } catch (error) {
        logger.error(`[ROL] Error al crear el rol: ${error.message}`);
        res.status(500).json({ error: 'Error al crear el rol' });
    }
};

// 2. OBTENER TODOS LOS ROLES (GET /roles/listar)
rolCtl.getRoles = async (req, res) => {
    const logger = getLogger(req);
    const incluirEliminados = req.query.incluirEliminados === 'true';
    logger.info(`[ROL] Solicitud de listado de roles (incluirEliminados: ${incluirEliminados})`);

    try {
        let querySQL = `SELECT r.id, r.nombre, r.estado, r.fecha_creacion, r.fecha_modificacion, 
                               ur.usuarioId,
                               u.nombre AS nombre_usuario_asociado, u.correo_electronico AS correo_usuario_asociado
                        FROM roles r
                        LEFT JOIN usuarios_roles ur ON r.id = ur.roleId
                        LEFT JOIN usuarios u ON ur.usuarioId = u.id`;
        
        const params = [];
        if (!incluirEliminados) {
            querySQL += ` WHERE r.estado = 'activo'`;
        }

        const [rolesSQL] = await sql.promise().query(querySQL, params);
        
        const rolesCompletos = rolesSQL.map(rolSQL => ({
            id: rolSQL.id,
            nombre: safeDecrypt(rolSQL.nombre),
            estado: rolSQL.estado,
            fecha_creacion: rolSQL.fecha_creacion,
            fecha_modificacion: rolSQL.fecha_modificacion,
            usuarioId: rolSQL.usuarioId,
            nombre_usuario_asociado: rolSQL.nombre_usuario_asociado ? safeDecrypt(rolSQL.nombre_usuario_asociado) : null,
            correo_usuario_asociado: rolSQL.correo_usuario_asociado ? safeDecrypt(rolSQL.correo_usuario_asociado) : null
        }));

        res.status(200).json(rolesCompletos);
    } catch (error) {
        logger.error(`[ROL] Error al obtener los roles: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los roles' });
    }
};

// 3. OBTENER UN ROL POR ID (GET /roles/detalle/:id)
rolCtl.getRolById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[ROL] Solicitud de rol por ID: ${id}`);

    try {
        const [rolSQL] = await sql.promise().query(
            `SELECT 
                r.id, 
                r.nombre, 
                r.estado, 
                r.fecha_creacion, 
                r.fecha_modificacion,
                ur.usuarioId,
                u.nombre AS nombre_usuario_asociado, 
                u.correo_electronico AS correo_usuario_asociado
            FROM 
                roles r
            LEFT JOIN usuarios_roles ur ON r.id = ur.roleId
            LEFT JOIN usuarios u ON ur.usuarioId = u.id
            WHERE 
                r.id = ? AND r.estado = 'activo'`, 
            [id]
        );

        if (rolSQL.length === 0) {
            logger.warn(`[ROL] Rol no encontrado: id=${id}`);
            return res.status(404).json({ error: 'Rol no encontrado o inactivo.' });
        }
        
        const rolData = rolSQL[0];
        const rolCompleto = {
            id: rolData.id,
            nombre: safeDecrypt(rolData.nombre),
            estado: rolData.estado,
            usuarioId: rolData.usuarioId,
            fecha_creacion: rolData.fecha_creacion,
            fecha_modificacion: rolData.fecha_modificacion,
            nombre_usuario_asociado: rolData.nombre_usuario_asociado ? safeDecrypt(rolData.nombre_usuario_asociado) : null,
            correo_usuario_asociado: rolData.correo_usuario_asociado ? safeDecrypt(rolData.correo_usuario_asociado) : null
        };

        res.status(200).json(rolCompleto);
    } catch (error) {
        logger.error(`[ROL] Error al obtener el rol: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener el rol' });
    }
};

// 4. ACTUALIZAR UN ROL POR ID (PUT /roles/actualizar/:id)
rolCtl.updateRol = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { nombre, estado } = req.body; // No se permite cambiar usuarioId en update
    logger.info(`[ROL] Actualización de rol: id=${id}`);

    try {
        // Verificar existencia y estado actual
        const [existingRol] = await sql.promise().query("SELECT * FROM roles WHERE id = ?", [id]);
        if (existingRol.length === 0) {
            logger.warn(`[ROL] Rol no encontrado para actualizar: id=${id}`);
            return res.status(404).json({ error: 'Rol no encontrado.' });
        }

        // Preparar campos y valores para la actualización SQL
        const campos = [];
        const valores = [];

        if (nombre !== undefined) {
            campos.push('nombre = ?');
            valores.push(cifrarDato(nombre));
        }
        if (estado !== undefined) {
            campos.push('estado = ?');
            valores.push(estado);
        }

        if (campos.length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        valores.push(id); // Añadir el ID para la cláusula WHERE
        const consultaSQL = `UPDATE roles SET ${campos.join(', ')} WHERE id = ?`;
        const [resultado] = await sql.promise().query(consultaSQL, valores);

        if (resultado.affectedRows === 0) {
            logger.warn(`[ROL] No se pudo actualizar el rol: id=${id}`);
            return res.status(500).json({ error: 'No se pudo actualizar el rol.' });
        }

        // Obtener el registro actualizado para la respuesta
        const [updatedRol] = await sql.promise().query("SELECT * FROM roles WHERE id = ?", [id]);
        const rolActualizado = updatedRol[0];

        res.status(200).json({
            message: 'Rol actualizado correctamente.',
            rol: {
                id: rolActualizado.id,
                nombre: safeDecrypt(rolActualizado.nombre),
                estado: rolActualizado.estado,
                usuarioId: rolActualizado.usuarioId, // Incluir usuarioId en la respuesta
                fecha_creacion: rolActualizado.fecha_creacion,
                fecha_modificacion: rolActualizado.fecha_modificacion
            }
        });
    } catch (error) {
        logger.error(`[ROL] Error al actualizar el rol: ${error.message}`);
        res.status(500).json({ error: 'Error al actualizar el rol' });
    }
};

// 5. ELIMINAR UN ROL (Borrado Lógico) (DELETE /roles/eliminar/:id)
rolCtl.deleteRol = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[ROL] Eliminación de rol: id=${id}`);
    try {
        // Verificar existencia y estado
        const [existingRol] = await sql.promise().query("SELECT * FROM roles WHERE id = ?", [id]);
        if (existingRol.length === 0 || existingRol[0].estado === 'eliminado') {
            logger.warn(`[ROL] Rol no encontrado o ya eliminado: id=${id}`);
            return res.status(404).json({ error: 'Rol no encontrado o ya eliminado.' });
        }

        // Marcar como eliminado en SQL directo
        const [resultado] = await sql.promise().query("UPDATE roles SET estado = 'eliminado' WHERE id = ?", [id]);
        
        if (resultado.affectedRows === 0) {
            logger.error(`[ROL] No se pudo marcar como eliminado el rol: id=${id}`);
            return res.status(500).json({ error: 'No se pudo eliminar el rol.' });
        }

        logger.info(`[ROL] Rol marcado como eliminado: id=${id}`);
        res.status(200).json({ message: 'Rol marcado como eliminado correctamente.' });
    } catch (error) {
        logger.error(`[ROL] Error al borrar el rol: ${error.message}`);
        res.status(500).json({ error: 'Error al borrar el rol' });
    }
};

module.exports = rolCtl;
