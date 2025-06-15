const { informes_estadisticas } = require('../Database/dataBase.orm'); // Asegúrate de ajustar la ruta según tu estructura de carpetas

// Controlador de informes de estadísticas
const informesCtl = {};

// Crear un nuevo informe de estadísticas
informesCtl.crearInforme = async (req, res) => {
    const {
        presion_boton_id,
        numero_notificaciones,
        numero_respuestas,
        evaluaciones_SOS,
        evaluaciones_911,
        evaluaciones_innecesaria
    } = req.body;

    try {
        // Crear un nuevo informe de estadísticas
        const nuevoInforme = await informes_estadisticas.create({
            presion_boton_id,
            numero_notificaciones,
            numero_respuestas,
            evaluaciones_SOS,
            evaluaciones_911,
            evaluaciones_innecesaria,
            estado: 'activo'  // Establecer estado por defecto
        });

        // Responder con el nuevo informe
        res.status(201).json({ message: 'Informe creado exitosamente', informe: nuevoInforme });

    } catch (error) {
        console.error('Error al crear el informe de estadísticas:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los informes de estadísticas activos
informesCtl.getInformes = async (req, res) => {
    try {
        const informes = await informes_estadisticas.findAll({ where: { estado: 'activo' } });
        res.status(200).json(informes);
    } catch (error) {
        console.error('Error al obtener los informes de estadísticas:', error.message);
        res.status(500).json({ error: 'Error al obtener los informes de estadísticas' });
    }
};

// Obtener un informe de estadísticas por ID
informesCtl.getInformeById = async (req, res) => {
    const { id } = req.params;
    try {
        const informe = await informes_estadisticas.findByPk(id);
        if (informe) {
            res.status(200).json(informe);
        } else {
            res.status(404).json({ error: 'Informe no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el informe de estadísticas:', error.message);
        res.status(500).json({ error: 'Error al obtener el informe de estadísticas' });
    }
};

// Actualizar un informe de estadísticas por ID
informesCtl.updateInforme = async (req, res) => {
    const { id } = req.params;

    try {
        const informe = await informes_estadisticas.findByPk(id);
        if (informe) {
            await informe.update(req.body);
            res.status(200).json(informe);
        } else {
            res.status(404).json({ error: 'Informe no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el informe de estadísticas:', error.message);
        res.status(500).json({ error: 'Error al actualizar el informe de estadísticas' });
    }
};

// Borrar un informe de estadísticas por ID (Marcar como eliminado)
informesCtl.deleteInforme = async (req, res) => {
    const { id } = req.params;
    try {
        const informe = await informes_estadisticas.findByPk(id);
        if (informe) {
            await informe.update({ estado: 'eliminado' }); // Marcar como eliminado en lugar de eliminar físicamente
            res.status(200).json({ message: 'Informe eliminado correctamente' });
        } else {
            res.status(404).json({ error: 'Informe no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el informe de estadísticas:', error.message);
        res.status(500).json({ error: 'Error al borrar el informe de estadísticas' });
    }
};

module.exports = informesCtl;
