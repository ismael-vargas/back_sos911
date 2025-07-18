// presion_boton_panico.router.js
const express = require('express');
const router = express.Router();

const {
  createPanicButtonPress,   
  getAllPanicButtonPresses, 
  getPanicButtonPressById,  
  updatePanicButtonPress,   
  deletePanicButtonPress   
} = require('../controller/presion_boton_panico.controller');

// Ruta para crear una nueva presión de botón de pánico
// URL final: POST /presion_boton_panico/crear
router.post('/crear', createPanicButtonPress);

// Ruta para listar todas las presiones de botón de pánico
// URL final: GET /presion_boton_panico/listar
router.get('/listar', getAllPanicButtonPresses);

// Ruta para obtener una presión específica por su ID
// URL final: GET /presion_boton_panico/detalle/123
router.get('/detalle/:id', getPanicButtonPressById);

// Ruta para actualizar una presión por su ID
// URL final: PUT /presion_boton_panico/actualizar/123
router.put('/actualizar/:id', updatePanicButtonPress);

// Ruta para eliminar una presión por su ID
// URL final: DELETE /presion_boton_panico/eliminar/123
router.delete('/eliminar/:id', deletePanicButtonPress);

module.exports = router;
