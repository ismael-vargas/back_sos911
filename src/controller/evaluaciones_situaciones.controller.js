const { evaluaciones_situacion, notificaciones } = require('../Database/dataBase.orm'); // Ajusta la ruta según tu estructura de carpetas

const evaluacionesSituacionesCtl = {};

// Crear una nueva evaluación de situación
evaluacionesSituacionesCtl.createEvaluacionSituacion = async (req, res) => {
    const { notificacion_id, evaluacion, detalle, estado } = req.body;

    try {
        // Verificar si la notificación existe
        const existingNotificacion = await notificaciones.findByPk(notificacion_id);
        if (!existingNotificacion) {
            return res.status(400).json({ message: 'La notificación no existe' });
        }

        // Crear una nueva evaluación de situación
        const nuevaEvaluacion = await evaluaciones_situacion.create({
            notificacion_id,
            evaluacion,
            detalle,
            estado: estado || 'activo' // Valor por defecto si no se proporciona
        });
        res.status(201).json(nuevaEvaluacion);
    } catch (error) {
        console.error('Error al crear la evaluación de situación:', error.message);
        res.status(500).json({ error: 'Error al crear la evaluación de situación' });
    }
};

// Obtener todas las evaluaciones de situaciones activas
evaluacionesSituacionesCtl.getEvaluacionesSituaciones = async (req, res) => {
    try {
        const evaluaciones = await evaluaciones_situacion.findAll({ where: { estado: 'activo' } });
        res.status(200).json(evaluaciones);
    } catch (error) {
        console.error('Error al obtener las evaluaciones de situaciones:', error.message);
        res.status(500).json({ error: 'Error al obtener las evaluaciones de situaciones' });
    }
};

// Obtener una evaluación de situación por ID
evaluacionesSituacionesCtl.getEvaluacionSituacionById = async (req, res) => {
    try {
        const evaluacion = await evaluaciones_situacion.findByPk(req.params.id);
        if (evaluacion) {
            res.status(200).json(evaluacion);
        } else {
            res.status(404).json({ error: 'Evaluación de situación no encontrada' });
        }
    } catch (error) {
        console.error('Error al obtener la evaluación de situación:', error.message);
        res.status(500).json({ error: 'Error al obtener la evaluación de situación' });
    }
};

// Actualizar una evaluación de situación por ID
evaluacionesSituacionesCtl.updateEvaluacionSituacion = async (req, res) => {
    try {
        const evaluacion = await evaluaciones_situacion.findByPk(req.params.id);
        if (evaluacion) {
            await evaluacion.update(req.body);
            res.status(200).json(evaluacion);
        } else {
            res.status(404).json({ error: 'Evaluación de situación no encontrada' });
        }
    } catch (error) {
        console.error('Error al actualizar la evaluación de situación:', error.message);
        res.status(500).json({ error: 'Error al actualizar la evaluación de situación' });
    }
};

// Borrar una evaluación de situación por ID (actualización de estado)
evaluacionesSituacionesCtl.deleteEvaluacionSituacion = async (req, res) => {
    try {
        const evaluacion = await evaluaciones_situacion.findByPk(req.params.id);
        if (evaluacion) {
            await evaluacion.update({ estado: 'eliminado' });
            res.status(200).json({ message: 'Evaluación de situación marcada como eliminada' });
        } else {
            res.status(404).json({ error: 'Evaluación de situación no encontrada' });
        }
    } catch (error) {
        console.error('Error al borrar la evaluación de situación:', error.message);
        res.status(500).json({ error: 'Error al borrar la evaluación de situación' });
    }
};

module.exports = evaluacionesSituacionesCtl;
