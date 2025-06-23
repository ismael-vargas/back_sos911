//evaluaciones_situaciones.router.js
const express = require('express');
const router = express.Router();
const {
  createEvaluacionSituacion,
  getEvaluacionesSituaciones,
  getEvaluacionSituacionById,
  updateEvaluacionSituacion,
  deleteEvaluacionSituacion
} = require('../controller/evaluaciones_situaciones.controller');

// Rutas agrupadas para evaluaciones_situaciones
router.route('/')
  .post(createEvaluacionSituacion)
  .get(getEvaluacionesSituaciones);

router.route('/:id')
  .get(getEvaluacionSituacionById)
  .put(updateEvaluacionSituacion)
  .delete(deleteEvaluacionSituacion);

module.exports = router;
