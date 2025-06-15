const { usuario_numero, usuario } = require('../Database/dataBase.orm'); // Asegúrate de que también importes el modelo de usuario
const usuarioNumeroCtl = {};

// Crear un nuevo usuarioNumero
usuarioNumeroCtl.crearUsuarioNumero = async (req, res, next) => {
    const { numero, usuario_id } = req.body;
    try {
        const existingUsuarioNumero = await usuario_numero.findOne({ where: { numero, usuario_id } });
        if (existingUsuarioNumero) {
            return res.status(400).json({ message: 'El número ya está registrado para este usuario.' });
        }

        // Verificar si el usuario_id existe en la tabla de usuarios
        const existingUsuario = await usuario.findByPk(usuario_id);
        if (!existingUsuario) {
            return res.status(400).json({ message: 'El usuario no existe.' });
        }

        const nuevoUsuarioNumero = await usuario_numero.create({
            numero,
            usuario_id
        });
        res.status(201).json({ message: 'Registro exitoso', usuarioNumero: nuevoUsuarioNumero });
    } catch (error) {
        console.error('Error al crear el usuarioNumero:', error.message);
        res.status(500).json({ error: 'Error al crear el usuarioNumero' });
    }
};

// Obtener todos los usuarioNumero activos
usuarioNumeroCtl.getUsuarioNumero = async (req, res) => {
    try {
        const usuariosNumeros = await usuario_numero.findAll({ where: { estado: 'activo' } });
        res.status(200).json(usuariosNumeros);
    } catch (error) {
        console.error('Error al obtener los usuariosNumeros:', error.message);
        res.status(500).json({ error: 'Error al obtener los usuariosNumeros' });
    }
};

// Obtener un usuarioNumero por ID
usuarioNumeroCtl.getUsuarioNumeroById = async (req, res) => {
    try {
        const usuarioNumero = await usuario_numero.findByPk(req.params.id);
        if (usuarioNumero && usuarioNumero.estado === 'activo') {
            res.status(200).json(usuarioNumero);
        } else {
            res.status(404).json({ error: 'Número de usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el número de usuario:', error.message);
        res.status(500).json({ error: 'Error al obtener el número de usuario' });
    }
};

// Actualizar un usuarioNumero por ID
usuarioNumeroCtl.updateUsuarioNumero = async (req, res) => {
    try {
        const usuarioNumero = await usuario_numero.findByPk(req.params.id);
        if (usuarioNumero) {
            await usuarioNumero.update(req.body);
            res.status(200).json(usuarioNumero);
        } else {
            res.status(404).json({ error: 'Número de usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el número de usuario:', error.message);
        res.status(500).json({ error: 'Error al actualizar el número de usuario' });
    }
};

// "Eliminar" un usuarioNumero por ID (cambio de estado a "inactivo")
usuarioNumeroCtl.deleteUsuarioNumero = async (req, res) => {
    try {
        const usuarioNumero = await usuario_numero.findByPk(req.params.id);
        if (usuarioNumero && usuarioNumero.estado === 'activo') {
            await usuarioNumero.update({ estado: 'eliminado' });
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Número de usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el número de usuario:', error.message);
        res.status(500).json({ error: 'Error al borrar el número de usuario' });
    }
};

module.exports = usuarioNumeroCtl;
