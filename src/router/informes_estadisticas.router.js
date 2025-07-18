//informes_estadisticas.router.js
const express = require('express');
const router = express.Router();

const {
  createReport,  
  getAllReports, 
  getReportById, 
  updateReport,  
  deleteReport    
} = require('../controller/informes_estadisticas.controller');

// Ruta para crear un nuevo informe
// URL final: POST /informes_estadisticas/crear
router.post('/crear', createReport);

// Ruta para listar todos los informes
// URL final: GET /informes_estadisticas/listar
router.get('/listar', getAllReports);

// Ruta para obtener un informe específico por su ID
// URL final: GET /informes_estadisticas/detalle/123
router.get('/detalle/:id', getReportById);

// Ruta para actualizar un informe por su ID
// URL final: PUT /informes_estadisticas/actualizar/123
router.put('/actualizar/:id', updateReport);

// Ruta para eliminar un informe por su ID
// URL final: DELETE /informes_estadisticas/eliminar/123
router.delete('/eliminar/:id', deleteReport);

module.exports = router;
