const { contactos_clientes } = require('../Database/dataBase.orm'); // Asegúrate de que la ruta sea correcta

const contactosClientesCtl = {};

// Crear un nuevo contacto de cliente
contactosClientesCtl.crearContactosCliente = async (req, res, next) => {
    const { cliente_id, contacto_id, notificacion_id } = req.body;
    console.log('Datos recibidos:', { cliente_id, contacto_id, notificacion_id });
    try {
        // Verificar si el contacto de cliente ya existe
        const existingContactoCliente = await contactos_clientes.findOne({ where: { cliente_id, contacto_id, notificacion_id } });
        if (existingContactoCliente) {
            return res.status(400).json({ message: 'El contacto de cliente ya está registrado.' });
        }

        // Crear un nuevo contacto de cliente
        const newContactoCliente = await contactos_clientes.create({
            cliente_id,
            contacto_id,
            notificacion_id
        });

        // Responder con el nuevo contacto de cliente
        res.status(201).json({ message: 'Registro exitoso', contactoCliente: newContactoCliente });

    } catch (error) {
        console.error('Error en el registro del contacto de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los contactos de clientes
contactosClientesCtl.getContactosClientes = async (req, res) => {
    try {
        const contactosClientes = await contactos_clientes.findAll({ where: { estado: 'activo' } });
        res.status(200).json(contactosClientes);
    } catch (error) {
        console.error('Error al obtener los contactos de clientes:', error.message);
        res.status(500).json({ error: 'Error al obtener los contactos de clientes' });
    }
};

// Obtener un contacto de cliente por ID
contactosClientesCtl.getContactosClienteById = async (req, res) => {
    try {
        const contactoCliente = await contactos_clientes.findByPk(req.params.id);
        if (contactoCliente && contactoCliente.estado === 'activo') {
            res.status(200).json(contactoCliente);
        } else {
            res.status(404).json({ error: 'Contacto de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el contacto de cliente:', error.message);
        res.status(500).json({ error: 'Error al obtener el contacto de cliente' });
    }
};

// Actualizar un contacto de cliente por ID
contactosClientesCtl.updateContactosCliente = async (req, res) => {
    try {
        const contactoCliente = await contactos_clientes.findByPk(req.params.id);
        if (contactoCliente && contactoCliente.estado === 'activo') {
            await contactoCliente.update(req.body);
            res.status(200).json(contactoCliente);
        } else {
            res.status(404).json({ error: 'Contacto de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el contacto de cliente:', error.message);
        res.status(500).json({ error: 'Error al actualizar el contacto de cliente' });
    }
};

// "Eliminar" un contacto de cliente por ID (cambio de estado a "eliminado")
contactosClientesCtl.deleteContactosCliente = async (req, res) => {
    try {
        const contactoCliente = await contactos_clientes.findByPk(req.params.id);
        if (contactoCliente && contactoCliente.estado === 'activo') {
            await contactoCliente.update({ estado: 'eliminado' });
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Contacto de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el contacto de cliente:', error.message);
        res.status(500).json({ error: 'Error al borrar el contacto de cliente' });
    }
};

module.exports = contactosClientesCtl;