const { notificaciones, presiones_boton_panico, clientes } = require('../Database/dataBase.orm'); 
const notificacionesCtl = {};

// Crear una nueva notificación
notificacionesCtl.crearNotificacion = async (req, res, next) => {
    const { presion_boton_id, cliente_notificado_id, recibido, respuesta } = req.body;
    try {
        const existingPresionBoton = await presiones_boton_panico.findByPk(presion_boton_id);
        if (!existingPresionBoton) {
            return res.status(400).json({ message: 'La presión del botón no existe.' });
        }

        const existingCliente = await clientes.findByPk(cliente_notificado_id);
        if (!existingCliente) {
            return res.status(400).json({ message: 'El cliente no existe.' });
        }

        const nuevaNotificacion = await notificaciones.create({
            presion_boton_id,
            cliente_notificado_id,
            recibido,
            respuesta
        });
        res.status(201).json(nuevaNotificacion);
    } catch (error) {
        console.error('Error al crear la notificación:', error.message);
        res.status(500).json({ error: 'Error al crear la notificación' });
    }
};

// Obtener todas las notificaciones
notificacionesCtl.getNotificaciones = async (req, res) => {
    try {
        const notificacionesList = await notificaciones.findAll();
        res.status(200).json(notificacionesList);
    } catch (error) {
        console.error('Error al obtener las notificaciones:', error.message);
        res.status(500).json({ error: 'Error al obtener las notificaciones' });
    }
};

// Obtener una notificación por ID
notificacionesCtl.getNotificacionById = async (req, res) => {
    try {
        const notificacion = await notificaciones.findByPk(req.params.id);
        if (notificacion) {
            res.status(200).json(notificacion);
        } else {
            res.status(404).json({ error: 'Notificación no encontrada' });
        }
    } catch (error) {
        console.error('Error al obtener la notificación:', error.message);
        res.status(500).json({ error: 'Error al obtener la notificación' });
    }
};

// Actualizar una notificación por ID
notificacionesCtl.updateNotificacion = async (req, res) => {
    try {
        const notificacion = await notificaciones.findByPk(req.params.id);
        if (notificacion) {
            await notificacion.update(req.body);
            res.status(200).json(notificacion);
        } else {
            res.status(404).json({ error: 'Notificación no encontrada' });
        }
    } catch (error) {
        console.error('Error al actualizar la notificación:', error.message);
        res.status(500).json({ error: 'Error al actualizar la notificación' });
    }
};

// Borrar una notificación por ID
notificacionesCtl.deleteNotificacion = async (req, res) => {
    try {
        const notificacion = await notificaciones.findByPk(req.params.id);
        if (notificacion) {
            await notificacion.destroy();
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Notificación no encontrada' });
        }
    } catch (error) {
        console.error('Error al borrar la notificación:', error.message);
        res.status(500).json({ error: 'Error al borrar la notificación' });
    }
};

module.exports = notificacionesCtl;