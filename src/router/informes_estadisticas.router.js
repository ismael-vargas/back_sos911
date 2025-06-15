const express = require('express');
const router = express.Router();
const {
    crearInforme,
    getInformes,
    getInformeById,
    updateInforme,
    deleteInforme
} = require('../controller/informes_estadisticas.controller'); // Ajusta la ruta según tu estructura de carpetas

// Rutas para los informes de estadísticas
router.post('/informes', crearInforme); // Crear un nuevo informe
router.get('/informes', getInformes); // Obtener todos los informes
router.get('/informes/:id', getInformeById); // Obtener un informe por ID
router.put('/informes/:id', updateInforme); // Actualizar un informe por ID
router.delete('/informes/:id', deleteInforme); // Borrar un informe por ID

module.exports = router;
