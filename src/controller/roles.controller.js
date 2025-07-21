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

// 1. CREAR UN NUEVO ROL (POST /roles/crear)
rolCtl.createRole = async (req, res) => {
    const logger = getLogger(req);
    let { nombre } = req.body; // Solo se necesita el nombre del rol para crear el rol
    logger.info(`[ROL] Intento de registro de rol: nombre=${nombre}`);

    if (!nombre) {
        logger.warn('[ROL] Registro fallido: campo "nombre" obligatorio faltante.');
        return res.status(400).json({ message: 'El campo "nombre" es obligatorio para crear un rol.' });
    }

    try {
        // Validación de unicidad para el nombre del rol al crear
        const [existingRoles] = await sql.promise().query("SELECT nombre FROM roles WHERE estado = 'activo'");
        const isRoleNameTaken = existingRoles.some(rol => safeDecrypt(rol.nombre) === nombre);

        if (isRoleNameTaken) {
            logger.warn(`[ROL] Registro fallido: El nombre de rol "${nombre}" ya existe.`);
            return res.status(409).json({ message: 'El nombre de rol ya está registrado.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);
        
        // CORREGIDO: Definir nombreCif antes de usarlo
        const nombreCif = cifrarDato(nombre); 

        // Crear el rol usando ORM
        const nuevoRol = await orm.rol.create({
            nombre: nombreCif,
            estado: 'activo', // Asegurar estado inicial
            fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
        });

        logger.info(`[ROL] Registro exitoso: id=${nuevoRol.id}, nombre=${nombre}`);
        res.status(201).json({
            message: 'Rol registrado exitosamente.',
            rol: {
                id: nuevoRol.id,
                nombre: safeDecrypt(nuevoRol.nombre),
                estado: nuevoRol.estado,
                fecha_creacion: nuevoRol.fecha_creacion,
                fecha_modificacion: nuevoRol.fecha_modificacion // Será null inicialmente
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
        let querySQL = `SELECT r.id, r.nombre, r.estado, r.fecha_creacion, r.fecha_modificacion
                        FROM roles r`;
        
        const params = [];
        if (!incluirEliminados) {
            querySQL += ` WHERE r.estado = 'activo'`;
        }
        querySQL += ` ORDER BY r.fecha_creacion DESC`; // Ordenar para consistencia

        const [rolesSQL] = await sql.promise().query(querySQL, params);
        
        const rolesCompletos = rolesSQL.map(rolSQL => ({
            id: rolSQL.id,
            nombre: safeDecrypt(rolSQL.nombre),
            estado: rolSQL.estado,
            fecha_creacion: rolSQL.fecha_creacion,
            fecha_modificacion: rolSQL.fecha_modificacion,
            // Ya no se incluyen datos de usuario asociado directamente aquí
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
                r.fecha_modificacion
            FROM 
                roles r
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
            fecha_creacion: rolData.fecha_creacion,
            fecha_modificacion: rolData.fecha_modificacion,
            // Ya no se incluyen datos de usuario asociado directamente aquí
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
    const { nombre, estado } = req.body; 
    logger.info(`[ROL] Actualización de rol: id=${id}`);

    try {
        // Verificar existencia y estado actual
        const [existingRol] = await sql.promise().query("SELECT * FROM roles WHERE id = ? AND estado = 'activo'", [id]); 
        if (existingRol.length === 0) {
            logger.warn(`[ROL] Rol no encontrado o inactivo para actualizar: id=${id}`);
            return res.status(404).json({ error: 'Rol no encontrado o inactivo.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar campos y valores para la actualización SQL
        const campos = [];
        const valores = [];

        if (nombre !== undefined) {
            // Validación de unicidad para el nombre del rol al actualizar
            const [allOtherRolesSQL] = await sql.promise().query("SELECT id, nombre FROM roles WHERE id != ? AND estado = 'activo'", [id]);
            const existingRoleWithNewName = allOtherRolesSQL.find(rol => safeDecrypt(rol.nombre) === nombre);

            if (existingRoleWithNewName) {
                logger.warn(`[ROL] Actualización fallida: El nuevo nombre de rol "${nombre}" ya está registrado por otro rol.`);
                return res.status(409).json({ message: 'El nuevo nombre de rol ya está registrado por otro rol.' });
            }
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

        // Siempre actualizar fecha_modificacion en SQL
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        valores.push(id); 
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
        const [existingRol] = await sql.promise().query("SELECT * FROM roles WHERE id = ? AND estado = 'activo'", [id]); 
        if (existingRol.length === 0 || existingRol[0].estado === 'eliminado') {
            logger.warn(`[ROL] Rol no encontrado o ya eliminado: id=${id}`);
            return res.status(404).json({ error: 'Rol no encontrado o ya eliminado.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado en SQL directo
        const [resultado] = await sql.promise().query("UPDATE roles SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
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
