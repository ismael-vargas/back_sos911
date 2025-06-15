const { grupos, cliente } = require('../Database/dataBase.orm'); // Asegúrate de que la ruta sea correcta

// Controlador de grupos
const gruposCtl = {};

// Crear un nuevo grupo
gruposCtl.crearGrupo = async (req, res) => {
    const { cliente_id, nombre } = req.body;

    // Validaciones adicionales
    if (!cliente_id || !nombre) {
        return res.status(400).json({ message: 'Faltan campos requeridos: cliente_id y nombre.' });
    }
    
    try {
        // Verificar si el grupo ya existe
        const existingGroup = await grupos.findOne({ where: { nombre } });
        if (existingGroup) {
            return res.status(400).json({ message: 'El nombre del grupo ya está registrado.' });
        }

        // Crear un nuevo grupo
        const newGroup = await grupos.create({
            cliente_id,
            nombre,
            estado: 'activo'  // Establecer estado por defecto
        });

        // Responder con el nuevo grupo
        res.status(201).json({ message: 'Grupo creado exitosamente', grupo: newGroup });

    } catch (error) {
        console.error('Error en la creación del grupo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
};

// Obtener todos los grupos activos
gruposCtl.getGrupos = async (req, res) => {
    try {
        const gruposList = await grupos.findAll({ where: { estado: 'activo' } });
        res.status(200).json(gruposList);
    } catch (error) {
        console.error('Error al obtener los grupos:', error.message);
        res.status(500).json({ error: 'Error al obtener los grupos' });
    }
};

// Obtener un grupo por ID
gruposCtl.getGrupoById = async (req, res) => {
    try {
        const grupo = await grupos.findByPk(req.params.id);
        if (grupo) {
            res.status(200).json(grupo);
        } else {
            res.status(404).json({ error: 'Grupo no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el grupo:', error.message);
        res.status(500).json({ error: 'Error al obtener el grupo' });
    }
};

// Actualizar un grupo por ID
gruposCtl.updateGrupo = async (req, res) => {
    const { cliente_id, nombre } = req.body;

    // Validaciones adicionales
    if (!cliente_id || !nombre) {
        return res.status(400).json({ message: 'Faltan campos requeridos: cliente_id y nombre.' });
    }

    try {
        const grupo = await grupos.findByPk(req.params.id);
        if (grupo) {
            await grupo.update({ cliente_id, nombre });
            res.status(200).json({ message: 'Grupo actualizado correctamente', grupo });
        } else {
            res.status(404).json({ error: 'Grupo no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el grupo:', error.message);
        res.status(500).json({ error: 'Error al actualizar el grupo' });
    }
};

// Borrar un grupo por ID
gruposCtl.deleteGrupo = async (req, res) => {
    try {
        const grupo = await grupos.findByPk(req.params.id);
        if (grupo) {
            await grupo.update({ estado: 'eliminado' }); // Marcar como eliminado en lugar de eliminar físicamente
            res.status(200).json({ message: 'Grupo eliminado correctamente' });
        } else {
            res.status(404).json({ error: 'Grupo no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el grupo:', error.message);
        res.status(500).json({ error: 'Error al borrar el grupo' });
    }
};

module.exports = gruposCtl;
