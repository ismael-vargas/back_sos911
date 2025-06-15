const { presiones_boton_panico, cliente,  ubicacion_cliente } = require('../Database/dataBase.orm'); // Asegúrate de que también importes los modelos necesarios
const presionesBotonPanicoCtl = {}

// Crear una nueva presión del botón de pánico
presionesBotonPanicoCtl.crearPresionBotonPanico = async (req, res, next) => {
    const { cliente_id, ubicacion_id } = req.body;
    try {
        // Verificar si el cliente_id existe en la tabla de clientes
        const existingCliente = await cliente.findByPk(cliente_id);
        if (!existingCliente) {
            return res.status(400).json({ message: 'El cliente no existe.' });
        }

        // Verificar si el ubicacion_id existe en la tabla de ubicaciones_clientes
        const existingUbicacion = await  ubicacion_cliente.findByPk(ubicacion_id);
        if (!existingUbicacion) {
            return res.status(400).json({ message: 'La ubicación no existe.' });
        }

        const nuevaPresionBotonPanico = await presiones_boton_panico.create({
            cliente_id,
            ubicacion_id
        });
        res.status(201).json(nuevaPresionBotonPanico);
    } catch (error) {
        console.error('Error al crear la presión del botón de pánico:', error.message);
        res.status(500).json({ error: 'Error al crear la presión del botón de pánico' });
    }
};

// Obtener todas las presiones del botón de pánico
presionesBotonPanicoCtl.getPresionesBotonPanico = async (req, res) => {
    try {
        const presiones = await presiones_boton_panico.findAll();
        res.status(200).json(presiones);
    } catch (error) {
        console.error('Error al obtener las presiones del botón de pánico:', error.message);
        res.status(500).json({ error: 'Error al obtener las presiones del botón de pánico' });
    }
};

// Obtener una presión del botón de pánico por ID
presionesBotonPanicoCtl.getPresionBotonPanicoById = async (req, res) => {
    try {
        const presion = await presiones_boton_panico.findByPk(req.params.id);
        if (presion) {
            res.status(200).json(presion);
        } else {
            res.status(404).json({ error: 'Presión del botón de pánico no encontrada' });
        }
    } catch (error) {
        console.error('Error al obtener la presión del botón de pánico:', error.message);
        res.status(500).json({ error: 'Error al obtener la presión del botón de pánico' });
    }
};

// Actualizar una presión del botón de pánico por ID
presionesBotonPanicoCtl.updatePresionBotonPanico = async (req, res) => {
    try {
        const presion = await presiones_boton_panico.findByPk(req.params.id);
        if (presion) {
            await presion.update(req.body);
            res.status(200).json(presion);
        } else {
            res.status(404).json({ error: 'Presión del botón de pánico no encontrada' });
        }
    } catch (error) {
        console.error('Error al actualizar la presión del botón de pánico:', error.message);
        res.status(500).json({ error: 'Error al actualizar la presión del botón de pánico' });
    }
};

// Borrar una presión del botón de pánico por ID
presionesBotonPanicoCtl.deletePresionBotonPanico = async (req, res) => {
    try {
        const presion = await presiones_boton_panico.findByPk(req.params.id);
        if (presion) {
            await presion.destroy();
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Presión del botón de pánico no encontrada' });
        }
    } catch (error) {
        console.error('Error al borrar la presión del botón de pánico:', error.message);
        res.status(500).json({ error: 'Error al borrar la presión del botón de pánico' });
    }
};

module.exports = presionesBotonPanicoCtl;
