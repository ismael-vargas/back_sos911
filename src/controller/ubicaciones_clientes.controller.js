const { ubicacion_cliente, cliente } = require('../Database/dataBase.orm'); // Asegúrate de importar el modelo de cliente
const ubicacionClienteCtl = {}

// Crear una nueva ubicacionCliente
ubicacionClienteCtl.crearUbicacionCliente = async (req, res, next) => {
    const { cliente_id, latitud, longitud, marca_tiempo } = req.body;
    try {
        // Verificar si el cliente_id existe en la tabla de clientes
        const existingCliente = await cliente.findByPk(cliente_id);
        if (!existingCliente) {
            return res.status(400).json({ message: 'El cliente no existe.' });
        }

        const nuevaUbicacionCliente = await ubicacion_cliente.create({
            cliente_id,
            latitud,
            longitud,
            marca_tiempo
        });
        res.status(201).json(nuevaUbicacionCliente);
    } catch (error) {
        console.error('Error al crear la ubicacionCliente:', error.message);
        res.status(500).json({ error: 'Error al crear la ubicacionCliente' });
    }
};

// Obtener todas las ubicacionesCliente
ubicacionClienteCtl.getUbicacionesCliente = async (req, res) => {
    try {
        const ubicacionesCliente = await ubicacion_cliente.findAll();
        res.status(200).json(ubicacionesCliente);
    } catch (error) {
        console.error('Error al obtener las ubicacionesCliente:', error.message);
        res.status(500).json({ error: 'Error al obtener las ubicacionesCliente' });
    }
};

// Obtener una ubicacionCliente por ID
ubicacionClienteCtl.getUbicacionClienteById = async (req, res) => {
    try {
        const ubicacionCliente = await ubicacion_cliente.findByPk(req.params.id);
        if (ubicacionCliente) {
            res.status(200).json(ubicacionCliente);
        } else {
            res.status(404).json({ error: 'UbicacionCliente no encontrada' });
        }
    } catch (error) {
        console.error('Error al obtener la ubicacionCliente:', error.message);
        res.status(500).json({ error: 'Error al obtener la ubicacionCliente' });
    }
};

// Actualizar una ubicacionCliente por ID
ubicacionClienteCtl.updateUbicacionCliente = async (req, res) => {
    try {
        const ubicacionCliente = await ubicacion_cliente.findByPk(req.params.id);
        if (ubicacionCliente) {
            await ubicacionCliente.update(req.body);
            res.status(200).json(ubicacionCliente);
        } else {
            res.status(404).json({ error: 'UbicacionCliente no encontrada' });
        }
    } catch (error) {
        console.error('Error al actualizar la ubicacionCliente:', error.message);
        res.status(500).json({ error: 'Error al actualizar la ubicacionCliente' });
    }
};

// Borrar una ubicacionCliente por ID
ubicacionClienteCtl.deleteUbicacionCliente = async (req, res) => {
    try {
        const ubicacionCliente = await ubicacion_cliente.findByPk(req.params.id);
        if (ubicacionCliente) {
            await ubicacionCliente.destroy();
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'UbicacionCliente no encontrada' });
        }
    } catch (error) {
        console.error('Error al borrar la ubicacionCliente:', error.message);
        res.status(500).json({ error: 'Error al borrar la ubicacionCliente' });
    }
};

module.exports = ubicacionClienteCtl;
