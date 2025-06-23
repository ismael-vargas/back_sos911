//presion_boton_panico.router.js
const express = require('express');
const router = express.Router();
const {
  crearPresionBotonPanico,
  getPresionesBotonPanico,
  getPresionBotonPanicoById,
  updatePresionBotonPanico,
  deletePresionBotonPanico
} = require('../controller/presion_boton_panico.controller');

// Rutas agrupadas para botón de pánico
router.route('/')
  .post(crearPresionBotonPanico)
  .get(getPresionesBotonPanico);

router.route('/:id')
  .get(getPresionBotonPanicoById)
  .put(updatePresionBotonPanico)
  .delete(deletePresionBotonPanico);

module.exports = router;
