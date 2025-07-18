//evaluaciones_situaciones.router.js
const express = require('express');
const router = express.Router();

const {
  createSituationEvaluation,   
  getAllSituationEvaluations,  
  getSituationEvaluationById,  
  updateSituationEvaluation,  
  deleteSituationEvaluation    
} = require('../controller/evaluaciones_situaciones.controller');

// Ruta para crear una nueva evaluación de situación
// URL final: POST /evaluaciones_situaciones/crear
router.post('/crear', createSituationEvaluation);

// Ruta para listar todas las evaluaciones de situaciones
// URL final: GET /evaluaciones_situaciones/listar
router.get('/listar', getAllSituationEvaluations);

// Ruta para obtener una evaluación específica por su ID
// URL final: GET /evaluaciones_situaciones/detalle/123
router.get('/detalle/:id', getSituationEvaluationById);

// Ruta para actualizar una evaluación por su ID
// URL final: PUT /evaluaciones_situaciones/actualizar/123
router.put('/actualizar/:id', updateSituationEvaluation);

// Ruta para eliminar una evaluación por su ID
// URL final: DELETE /evaluaciones_situaciones/eliminar/123
router.delete('/eliminar/:id', deleteSituationEvaluation);

module.exports = router;
