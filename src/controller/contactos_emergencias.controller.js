const { contactos_emergencia } = require('../Database/dataBase.orm'); // Ajusta la ruta según tu estructura

const contactosEmergenciasCtl = {};

// Crear un nuevo contacto de emergencia
contactosEmergenciasCtl.createContactoEmergencia = async (req, res) => {
    const { cliente_id, nombre, descripcion, telefono, estado } = req.body;

    try {
        const contactoExistente = await contactos_emergencia.findOne({ where: { cliente_id, nombre } });
        if (contactoExistente) {
            return res.status(400).json({ message: 'El contacto de emergencia ya está registrado.' });
        }

        const nuevoContacto = await contactos_emergencia.create({
            cliente_id,
            nombre,
            descripcion,
            telefono,
            estado: estado || 'activo'
        });

        res.status(201).json(nuevoContacto);
    } catch (error) {
        console.error('Error al crear el contacto de emergencia:', error.message);
        res.status(500).json({ error: 'Error al crear el contacto de emergencia' });
    }
};

// Obtener todos los contactos de emergencia activos
contactosEmergenciasCtl.getContactosEmergencias = async (req, res) => {
    try {
        const contactos = await contactos_emergencia.findAll({
            where: { estado: 'activo' }
        });
        res.status(200).json(contactos);
    } catch (error) {
        console.error('Error al obtener los contactos de emergencia:', error.message);
        res.status(500).json({ error: 'Error al obtener los contactos de emergencia' });
    }
};

// Obtener un contacto de emergencia por ID
contactosEmergenciasCtl.getContactoEmergenciaById = async (req, res) => {
    try {
        const contacto = await contactos_emergencia.findByPk(req.params.id);
        if (contacto) {
            res.status(200).json(contacto);
        } else {
            res.status(404).json({ error: 'Contacto de emergencia no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el contacto de emergencia:', error.message);
        res.status(500).json({ error: 'Error al obtener el contacto de emergencia' });
    }
};

// Actualizar un contacto de emergencia por ID
contactosEmergenciasCtl.updateContactoEmergencia = async (req, res) => {
    try {
        const contacto = await contactos_emergencia.findByPk(req.params.id);
        if (contacto) {
            await contacto.update(req.body); // req.body puede contener descripcion, telefono, etc.
            res.status(200).json(contacto);
        } else {
            res.status(404).json({ error: 'Contacto de emergencia no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el contacto de emergencia:', error.message);
        res.status(500).json({ error: 'Error al actualizar el contacto de emergencia' });
    }
};

// Borrar un contacto de emergencia por ID (actualización de estado)
contactosEmergenciasCtl.deleteContactoEmergencia = async (req, res) => {
    try {
        const contacto = await contactos_emergencia.findByPk(req.params.id);
        if (contacto) {
            await contacto.update({ estado: 'eliminado' });
            res.status(200).json({ message: 'Contacto de emergencia marcado como eliminado' });
        } else {
            res.status(404).json({ error: 'Contacto de emergencia no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el contacto de emergencia:', error.message);
        res.status(500).json({ error: 'Error al borrar el contacto de emergencia' });
    }
};

module.exports = contactosEmergenciasCtl;
// cambios realizados