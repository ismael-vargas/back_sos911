const { rol, usuario } = require('../Database/dataBase.orm'); // Asegúrate de importar el modelo de usuario
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');
const rolCtl = {};

// Utilidad para obtener el logger desde req.app
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// Crear un nuevo rol
rolCtl.crearRol = async (req, res, next) => {
    const logger = getLogger(req);
    let { usuario_id, nombre } = req.body;
    logger.info(`[ROL] Intento de registro: usuario_id=${usuario_id}, nombre=${nombre}`);
    try {
        // Verificar si el usuario_id existe en la tabla de usuarios
        const existingUsuario = await usuario.findByPk(usuario_id);
        if (!existingUsuario) {
            logger.warn(`[ROL] Registro fallido: usuario no existe (usuario_id=${usuario_id})`);
            return res.status(400).json({ message: 'El usuario no existe.' });
        }
        // Cifrar el nombre
        const nombreCif = cifrarDato(nombre);
        const nuevoRol = await rol.create({
            usuario_id,
            nombre: nombreCif
        });
        logger.info(`[ROL] Registro exitoso: id=${nuevoRol.id}, usuario_id=${usuario_id}`);
        res.status(201).json({
            ...nuevoRol.toJSON(),
            nombre: descifrarDato(nuevoRol.nombre)
        });
    } catch (error) {
        logger.error(`[ROL] Error al crear el rol: ${error.message}`);
        res.status(500).json({ error: 'Error al crear el rol' });
    }
};

// Obtener todos los roles activos
rolCtl.getRoles = async (req, res) => {
    const logger = getLogger(req);
    logger.info('[ROL] Solicitud de listado de roles');
    try {
        const roles = await rol.findAll({ where: { estado: 'activo' } });
        // Descifrar los nombres antes de enviar
        const rolesDescifrados = roles.map(r => ({
            ...r.toJSON(),
            nombre: descifrarDato(r.nombre)
        }));
        res.status(200).json(rolesDescifrados);
    } catch (error) {
        logger.error(`[ROL] Error al obtener los roles: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los roles' });
    }
};

// Obtener un rol por ID
rolCtl.getRolById = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[ROL] Solicitud de rol por ID: ${req.params.id}`);
    try {
        const roles = await rol.findByPk(req.params.id);
        if (roles && roles.estado === 'activo') {
            res.status(200).json({
                ...roles.toJSON(),
                nombre: descifrarDato(roles.nombre)
            });
        } else {
            logger.warn(`[ROL] Rol no encontrado: id=${req.params.id}`);
            res.status(404).json({ error: 'Rol no encontrado' });
        }
    } catch (error) {
        logger.error(`[ROL] Error al obtener el rol: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener el rol' });
    }
};

// Actualizar un rol por ID
rolCtl.updateRol = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[ROL] Actualización de rol: id=${req.params.id}`);
    try {
        const roles = await rol.findByPk(req.params.id);
        if (roles) {
            // Cifrar el nombre si se actualiza
            if (req.body.nombre !== undefined) {
                req.body.nombre = cifrarDato(req.body.nombre);
            }
            await roles.update(req.body);
            logger.info(`[ROL] Rol actualizado correctamente: id=${roles.id}`);
            res.status(200).json({
                ...roles.toJSON(),
                nombre: descifrarDato(roles.nombre)
            });
        } else {
            logger.warn(`[ROL] Rol no encontrado para actualizar: id=${req.params.id}`);
            res.status(404).json({ error: 'Rol no encontrado' });
        }
    } catch (error) {
        logger.error(`[ROL] Error al actualizar el rol: ${error.message}`);
        res.status(500).json({ error: 'Error al actualizar el rol' });
    }
};

// "Eliminar" un rol por ID (cambio de estado a "eliminado")
rolCtl.deleteRol = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[ROL] Eliminación de rol: id=${req.params.id}`);
    try {
        const roles = await rol.findByPk(req.params.id);
        if (roles && roles.estado === 'activo') {
            await roles.update({ estado: 'eliminado' });
            logger.info(`[ROL] Rol marcado como eliminado: id=${roles.id}`);
            res.status(204).send();
        } else {
            logger.warn(`[ROL] Rol no encontrado para eliminar: id=${req.params.id}`);
            res.status(404).json({ error: 'Rol no encontrado' });
        }
    } catch (error) {
        logger.error(`[ROL] Error al borrar el rol: ${error.message}`);
        res.status(500).json({ error: 'Error al borrar el rol' });
    }
};

module.exports = rolCtl;
