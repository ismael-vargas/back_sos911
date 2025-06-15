const { rol, usuario } = require('../Database/dataBase.orm'); // Asegúrate de importar el modelo de usuario
const rolCtl = {};

// Crear un nuevo rol
rolCtl.crearRol = async (req, res, next) => {
    const { usuario_id, nombre } = req.body;
    try {
        // Verificar si el usuario_id existe en la tabla de usuarios
        const existingUsuario = await usuario.findByPk(usuario_id);
        if (!existingUsuario) {
            return res.status(400).json({ message: 'El usuario no existe.' });
        }

        const nuevoRol = await rol.create({
            usuario_id,
            nombre
        });
        res.status(201).json(nuevoRol);
    } catch (error) {
        console.error('Error al crear el rol:', error.message);
        res.status(500).json({ error: 'Error al crear el rol' });
    }
};

// Obtener todos los roles activos
rolCtl.getRoles = async (req, res) => {
    try {
        const roles = await rol.findAll({ where: { estado: 'activo' } });
        res.status(200).json(roles);
    } catch (error) {
        console.error('Error al obtener los roles:', error.message);
        res.status(500).json({ error: 'Error al obtener los roles' });
    }
};

// Obtener un rol por ID
rolCtl.getRolById = async (req, res) => {
    try {
        const roles = await rol.findByPk(req.params.id);
        if (roles && roles.estado === 'activo') {
            res.status(200).json(roles);
        } else {
            res.status(404).json({ error: 'Rol no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el rol:', error.message);
        res.status(500).json({ error: 'Error al obtener el rol' });
    }
};

// Actualizar un rol por ID
rolCtl.updateRol = async (req, res) => {
    try {
        const roles = await rol.findByPk(req.params.id);
        if (roles) {
            await roles.update(req.body);
            res.status(200).json(roles);
        } else {
            res.status(404).json({ error: 'Rol no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el rol:', error.message);
        res.status(500).json({ error: 'Error al actualizar el rol' });
    }
};

// "Eliminar" un rol por ID (cambio de estado a "eliminado")
rolCtl.deleteRol = async (req, res) => {
    try {
        const roles = await rol.findByPk(req.params.id);
        if (roles && roles.estado === 'activo') {
            await roles.update({ estado: 'eliminado' });
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Rol no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el rol:', error.message);
        res.status(500).json({ error: 'Error al borrar el rol' });
    }
};

module.exports = rolCtl;
