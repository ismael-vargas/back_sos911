const express = require('express');
const router = express.Router();
const { createEvaluacionSituacion, getEvaluacionesSituaciones, getEvaluacionSituacionById, updateEvaluacionSituacion, deleteEvaluacionSituacion } = require('../controller/evaluaciones_situaciones.controller'); // Ajusta la ruta según tu estructura de carpetas

// Rutas para evaluaciones_situaciones
router.post('/evaluaciones-situaciones', createEvaluacionSituacion);
router.get('/evaluaciones-situaciones', getEvaluacionesSituaciones);
router.get('/evaluaciones-situaciones/:id', getEvaluacionSituacionById);
router.put('/evaluaciones-situaciones/:id', updateEvaluacionSituacion);
router.delete('/evaluaciones-situaciones/:id', deleteEvaluacionSituacion);

module.exports = router;
