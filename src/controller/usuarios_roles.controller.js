const { usuarios_roles, usuario, rol } = require('../Database/dataBase.orm'); // Asegúrate de importar los modelos de usuario y rol
const usuarioRolesCtl = {};

// Crear un nuevo usuarioRol
usuarioRolesCtl.crearUsuarioRoles = async (req, res, next) => {
    const { usuario_id, rol_id } = req.body;
    try {
        // Verificar si el usuario_id existe en la tabla de usuarios
        const existingUsuario = await usuario.findByPk(usuario_id);
        if (!existingUsuario) {
            return res.status(400).json({ message: 'El usuario no existe.' });
        }

        // Verificar si el rol_id existe en la tabla de roles
        const existingRol = await rol.findByPk(rol_id);
        if (!existingRol) {
            return res.status(400).json({ message: 'El rol no existe.' });
        }

        const nuevoUsuarioRol = await usuarios_roles.create(req.body);
        res.status(201).json(nuevoUsuarioRol);
    } catch (error) {
        console.error('Error al crear el usuarioRol:', error.message);
        res.status(500).json({ error: 'Error al crear el usuarioRol' });
    }
};

// Obtener todos los usuariosRoles activos
usuarioRolesCtl.getUsuariosRoles = async (req, res) => {
    try {
        const usuariosRoles = await usuarios_roles.findAll({ where: { estado: 'activo' } });
        res.status(200).json(usuariosRoles);
    } catch (error) {
        console.error('Error al obtener los usuariosRoles:', error.message);
        res.status(500).json({ error: 'Error al obtener los usuariosRoles' });
    }
};

// Obtener un usuarioRol por ID
usuarioRolesCtl.getUsuarioRolById = async (req, res) => {
    try {
        const userRol = await usuarios_roles.findByPk(req.params.id);
        if (userRol && userRol.estado === 'activo') {
            res.status(200).json(userRol);
        } else {
            res.status(404).json({ error: 'UsuarioRol no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el usuarioRol:', error.message);
        res.status(500).json({ error: 'Error al obtener el usuarioRol' });
    }
};

// Actualizar un usuarioRol por ID
usuarioRolesCtl.updateUsuarioRol = async (req, res) => {
    try {
        const userRol = await usuarios_roles.findByPk(req.params.id);
        if (userRol) {
            await userRol.update(req.body);
            res.status(200).json(userRol);
        } else {
            res.status(404).json({ error: 'UsuarioRol no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el usuarioRol:', error.message);
        res.status(500).json({ error: 'Error al actualizar el usuarioRol' });
    }
};

// "Eliminar" un usuarioRol por ID (cambio de estado a "eliminado")
usuarioRolesCtl.deleteUsuarioRol = async (req, res) => {
    try {
        const userRol = await usuarios_roles.findByPk(req.params.id);
        if (userRol && userRol.estado === 'activo') {
            await userRol.update({ estado: 'eliminado' });
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'UsuarioRol no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el usuarioRol:', error.message);
        res.status(500).json({ error: 'Error al borrar el usuarioRol' });
    }
};

module.exports = usuarioRolesCtl;
