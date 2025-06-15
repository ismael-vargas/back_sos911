const express = require('express');
const router = express.Router();
const {crearPresionBotonPanico, getPresionesBotonPanico, getPresionBotonPanicoById, updatePresionBotonPanico, deletePresionBotonPanico} = require('../controller/presion_boton_panico.controller'); // Asegúrate de que la ruta sea correcta

// Crear una nueva presión del botón de pánico
router.post('/boton-panico', crearPresionBotonPanico);

// Obtener todas las presiones del botón de pánico
router.get('/boton-panico', getPresionesBotonPanico);

// Obtener una presión del botón de pánico por ID
router.get('/boton-panico/:id', getPresionBotonPanicoById);

// Actualizar una presión del botón de pánico por ID
router.put('/boton-panico/:id', updatePresionBotonPanico);

// Borrar una presión del botón de pánico por ID
router.delete('/boton-panico/:id', deletePresionBotonPanico);

module.exports = router;
