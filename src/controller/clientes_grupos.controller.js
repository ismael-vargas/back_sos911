const { clientes_grupos } = require('../Database/dataBase.orm'); // Asegúrate de que la ruta sea correcta

const clientesGruposCtl = {};

// Crear un nuevo grupo de cliente
clientesGruposCtl.crearClientesGrupo = async (req, res, next) => {
    const { grupo_id, cliente_id, estado } = req.body;
    try {
        // Verificar si el grupo de cliente ya existe para el cliente especificado
        const existingClienteGrupo = await clientes_grupos.findOne({ where: { grupo_id, cliente_id } });
        if (existingClienteGrupo) {
            return res.status(400).json({ message: 'El grupo de cliente ya está registrado para este cliente.' });
        }

        // Crear un nuevo grupo de cliente
        const newClienteGrupo = await clientes_grupos.create({
            grupo_id,
            cliente_id,
            estado
        });

        // Responder con el nuevo grupo de cliente
        res.status(201).json({ message: 'Registro exitoso', clienteGrupo: newClienteGrupo });

    } catch (error) {
        console.error('Error en el registro del grupo de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los grupos de clientes
clientesGruposCtl.getClientesGrupos = async (req, res) => {
    try {
        const clientesGrupos = await clientes_grupos.findAll();
        res.status(200).json(clientesGrupos);
    } catch (error) {
        console.error('Error al obtener los grupos de clientes:', error.message);
        res.status(500).json({ error: 'Error al obtener los grupos de clientes' });
    }
};

// Obtener un grupo de cliente por ID
clientesGruposCtl.getClientesGrupoById = async (req, res) => {
    try {
        const clienteGrupo = await clientes_grupos.findByPk(req.params.id);
        if (clienteGrupo) {
            res.status(200).json(clienteGrupo);
        } else {
            res.status(404).json({ error: 'Grupo de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el grupo de cliente:', error.message);
        res.status(500).json({ error: 'Error al obtener el grupo de cliente' });
    }
};

// Actualizar un grupo de cliente por ID
clientesGruposCtl.updateClientesGrupo = async (req, res) => {
    try {
        const clienteGrupo = await clientes_grupos.findByPk(req.params.id);
        if (clienteGrupo) {
            await clienteGrupo.update(req.body);
            res.status(200).json(clienteGrupo);
        } else {
            res.status(404).json({ error: 'Grupo de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el grupo de cliente:', error.message);
        res.status(500).json({ error: 'Error al actualizar el grupo de cliente' });
    }
};

// Cambiar estado a 'inactivo' de un grupo de cliente por ID
clientesGruposCtl.deleteClientesGrupo = async (req, res) => {
    try {
        const clienteGrupo = await clientes_grupos.findByPk(req.params.id);
        if (clienteGrupo) {
            await clienteGrupo.update({ estado: 'eliminado' });
            res.status(200).json({ message: 'Grupo de cliente marcado como inactivo' });
        } else {
            res.status(404).json({ error: 'Grupo de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al cambiar el estado del grupo de cliente:', error.message);
        res.status(500).json({ error: 'Error al cambiar el estado del grupo de cliente' });
    }
};

module.exports = clientesGruposCtl;