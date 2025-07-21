// Importa los modelos de ambas bases de datos (ORM y SQL directo) y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (ORM)
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Utilidades de cifrado/descifrado

const usuarioRolesCtl = {};

// --- Utilidad para Descifrado Seguro ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos de usuario-rol:', error.message);
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

// --- Utilidad para obtener el logger desde req.app ---
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// 1. ASIGNAR ROL A USUARIO (POST /usuarios_roles/asignar)
usuarioRolesCtl.assignRoleToUser = async (req, res) => {
    const logger = getLogger(req);
    const { usuarioId, roleId } = req.body;
    logger.info(`[USUARIO-ROL] Intento de asignación: usuarioId=${usuarioId}, roleId=${roleId}`);

    if (!usuarioId || !roleId) {
        logger.warn('[USUARIO-ROL] Asignación fallida: campos obligatorios faltantes');
        return res.status(400).json({ message: 'Faltan campos obligatorios: usuarioId y roleId.' });
    }

    try {
        // Verificar si el usuario existe usando SQL directo
        const [existingUsers] = await sql.promise().query("SELECT id FROM usuarios WHERE id = ? AND estado = 'activo'", [usuarioId]);
        if (existingUsers.length === 0) {
            logger.warn(`[USUARIO-ROL] Asignación fallida: usuario no existe o está inactivo (usuarioId=${usuarioId})`);
            return res.status(400).json({ message: 'El usuario asociado no existe o no está activo.' });
        }

        // Verificar si el rol existe usando SQL directo
        const [existingRoles] = await sql.promise().query("SELECT id FROM roles WHERE id = ? AND estado = 'activo'", [roleId]);
        if (existingRoles.length === 0) {
            logger.warn(`[USUARIO-ROL] Asignación fallida: rol no existe o está inactivo (roleId=${roleId})`);
            return res.status(400).json({ message: 'El rol asociado no existe o no está activo.' });
        }

        // Verificar si la relación ya existe
        const [existingRelation] = await sql.promise().query("SELECT id FROM usuarios_roles WHERE usuarioId = ? AND roleId = ? AND estado = 'activo'", [usuarioId, roleId]);
        if (existingRelation.length > 0) {
            logger.warn(`[USUARIO-ROL] Asignación fallida: relación ya existe (usuarioId=${usuarioId}, roleId=${roleId})`);
            return res.status(400).json({ message: 'Esta relación usuario-rol ya existe.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Crear la relación usando ORM
        const nuevaRelacion = await orm.usuarios_roles.create({
            usuarioId: usuarioId,
            roleId: roleId,
            estado: 'activo', // Asegurar estado inicial
            fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
        });

        logger.info(`[USUARIO-ROL] Asignación exitosa: id=${nuevaRelacion.id}, usuarioId=${usuarioId}, roleId=${roleId}`);
        res.status(201).json({
            message: 'Rol asignado exitosamente.',
            usuarioRol: {
                id: nuevaRelacion.id,
                usuarioId: nuevaRelacion.usuarioId,
                roleId: nuevaRelacion.roleId,
                estado: nuevaRelacion.estado,
                fecha_creacion: nuevaRelacion.fecha_creacion,
                fecha_modificacion: nuevaRelacion.fecha_modificacion // Puede ser null si no se ha modificado
            }
        });
    } catch (error) {
        logger.error(`[USUARIO-ROL] Error al asignar rol: ${error.message}`);
        res.status(500).json({ error: 'Error al asignar rol' });
    }
};

// 2. OBTENER TODAS LAS ASIGNACIONES (GET /usuarios_roles/listar)
usuarioRolesCtl.getAllUserRoles = async (req, res) => {
    const logger = getLogger(req);
    const incluirEliminados = req.query.incluirEliminados === 'true';
    logger.info(`[USUARIO-ROL] Solicitud de listado (incluirEliminados: ${incluirEliminados})`);

    try {
        let querySQL = `SELECT ur.id, ur.usuarioId, ur.roleId, ur.estado, ur.fecha_creacion, ur.fecha_modificacion,
                               u.nombre AS nombre_usuario, u.correo_electronico AS correo_usuario,
                               r.nombre AS nombre_rol
                        FROM usuarios_roles ur
                        LEFT JOIN usuarios u ON ur.usuarioId = u.id
                        LEFT JOIN roles r ON ur.roleId = r.id`;
        
        const params = [];
        if (!incluirEliminados) {
            querySQL += ` WHERE ur.estado = 'activo'`;
        }
        querySQL += ` ORDER BY ur.fecha_creacion DESC`; // Ordenar para consistencia

        const [relacionesSQL] = await sql.promise().query(querySQL, params);
        
        const relacionesCompletas = relacionesSQL.map(relacion => ({
            id: relacion.id,
            usuarioId: relacion.usuarioId,
            roleId: relacion.roleId,
            estado: relacion.estado,
            fecha_creacion: relacion.fecha_creacion,
            fecha_modificacion: relacion.fecha_modificacion,
            nombre_usuario: relacion.nombre_usuario ? safeDecrypt(relacion.nombre_usuario) : null,
            correo_usuario: relacion.correo_usuario ? safeDecrypt(relacion.correo_usuario) : null,
            nombre_rol: relacion.nombre_rol ? safeDecrypt(relacion.nombre_rol) : null
        }));

        res.status(200).json(relacionesCompletas);
    } catch (error) {
        logger.error(`[USUARIO-ROL] Error al obtener las relaciones: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener las relaciones' });
    }
};

// 3. OBTENER RELACIÓN POR ID (GET /usuarios_roles/detalle/:id)
usuarioRolesCtl.getUserRoleById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[USUARIO-ROL] Solicitud de relación por ID: ${id}`);

    try {
        const [relacionSQL] = await sql.promise().query(
            `SELECT ur.id, ur.usuarioId, ur.roleId, ur.estado, ur.fecha_creacion, ur.fecha_modificacion,
                    u.nombre AS nombre_usuario, u.correo_electronico AS correo_usuario,
                    r.nombre AS nombre_rol
             FROM usuarios_roles ur
             LEFT JOIN usuarios u ON ur.usuarioId = u.id
             LEFT JOIN roles r ON ur.roleId = r.id
             WHERE ur.id = ? AND ur.estado = 'activo'`, 
            [id]
        );

        if (relacionSQL.length === 0) {
            logger.warn(`[USUARIO-ROL] Relación no encontrada: id=${id}`);
            return res.status(404).json({ error: 'Relación usuario-rol no encontrada.' });
        }
        
        const relacionData = relacionSQL[0];
        const relacionCompleta = {
            id: relacionData.id,
            usuarioId: relacionData.usuarioId,
            roleId: relacionData.roleId,
            estado: relacionData.estado,
            fecha_creacion: relacionData.fecha_creacion,
            fecha_modificacion: relacionData.fecha_modificacion,
            nombre_usuario: relacionData.nombre_usuario ? safeDecrypt(relacionData.nombre_usuario) : null,
            correo_usuario: relacionData.correo_usuario ? safeDecrypt(relacionData.correo_usuario) : null,
            nombre_rol: relacionData.nombre_rol ? safeDecrypt(relacionData.nombre_rol) : null
        };

        res.status(200).json(relacionCompleta);
    } catch (error) {
        logger.error(`[USUARIO-ROL] Error al obtener la relación: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener la relación' });
    }
};

// 4. ACTUALIZAR RELACIÓN (PUT /usuarios_roles/actualizar/:id)
usuarioRolesCtl.updateUserRole = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { usuarioId, roleId, estado } = req.body;
    logger.info(`[USUARIO-ROL] Actualización de relación: id=${id}`);

    try {
        // Verificar existencia
        const [existingRelation] = await sql.promise().query("SELECT * FROM usuarios_roles WHERE id = ? AND estado = 'activo'", [id]); 
        if (existingRelation.length === 0) {
            logger.warn(`[USUARIO-ROL] Relación no encontrada o inactiva para actualizar: id=${id}`);
            return res.status(404).json({ error: 'Relación no encontrada o inactiva.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar campos para actualización
        const campos = [];
        const valores = [];

        if (usuarioId !== undefined) {
            // Verificar que el usuario existe
            const [userExists] = await sql.promise().query("SELECT id FROM usuarios WHERE id = ? AND estado = 'activo'", [usuarioId]);
            if (userExists.length === 0) {
                return res.status(400).json({ message: 'El usuario asociado no existe o no está activo.' });
            }
            campos.push('usuarioId = ?');
            valores.push(usuarioId);
        }

        if (roleId !== undefined) {
            // Verificar que el rol existe
            const [roleExists] = await sql.promise().query("SELECT id FROM roles WHERE id = ? AND estado = 'activo'", [roleId]);
            if (roleExists.length === 0) {
                return res.status(400).json({ message: 'El rol asociado no existe o no está activo.' });
            }
            campos.push('roleId = ?');
            valores.push(roleId);
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

        valores.push(id);
        const consultaSQL = `UPDATE usuarios_roles SET ${campos.join(', ')} WHERE id = ?`;
        const [resultado] = await sql.promise().query(consultaSQL, valores);

        if (resultado.affectedRows === 0) {
            logger.warn(`[USUARIO-ROL] No se pudo actualizar la relación: id=${id}`);
            return res.status(500).json({ error: 'No se pudo actualizar la relación.' });
        }

        logger.info(`[USUARIO-ROL] Relación actualizada: id=${id}`);
        res.status(200).json({ message: 'Relación actualizada correctamente.' });
    } catch (error) {
        logger.error(`[USUARIO-ROL] Error al actualizar la relación: ${error.message}`);
        res.status(500).json({ error: 'Error al actualizar la relación' });
    }
};

// 5. ELIMINAR RELACIÓN (DELETE /usuarios_roles/eliminar/:id)
usuarioRolesCtl.deleteUserRole = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[USUARIO-ROL] Eliminación de relación: id=${id}`);

    try {
        // Verificar existencia y estado
        const [existingRelation] = await sql.promise().query("SELECT * FROM usuarios_roles WHERE id = ? AND estado = 'activo'", [id]); 
        if (existingRelation.length === 0 || existingRelation[0].estado === 'eliminado') {
            logger.warn(`[USUARIO-ROL] Relación no encontrada o ya eliminada: id=${id}`);
            return res.status(404).json({ error: 'Relación no encontrada o ya eliminada.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado
        const [resultado] = await sql.promise().query("UPDATE usuarios_roles SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
        if (resultado.affectedRows === 0) {
            logger.error(`[USUARIO-ROL] No se pudo marcar como eliminada la relación: id=${id}`);
            return res.status(500).json({ error: 'No se pudo eliminar la relación.' });
        }

        logger.info(`[USUARIO-ROL] Relación marcada como eliminada: id=${id}`);
        res.status(200).json({ message: 'Relación marcada como eliminada correctamente.' });
    } catch (error) {
        logger.error(`[USUARIO-ROL] Error al borrar la relación: ${error.message}`);
        res.status(500).json({ error: 'Error al borrar la relación' });
    }
};

module.exports = usuarioRolesCtl;
