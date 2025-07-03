// servicios_emergencia.router.js
const express = require('express');
const router = express.Router();

const {
  crearServicioEmergencia,
  getServiciosEmergencia,
  getServicioEmergenciaById,
  updateServicioEmergencia,
  deleteServicioEmergencia
} = require('../controller/servicios_emergencia.controller');

// Rutas CRUD para servicios de emergencia
router.route('/')
  .get(getServiciosEmergencia)
  .post(crearServicioEmergencia);

router.route('/:id')
  .get(getServicioEmergenciaById)
  .put(updateServicioEmergencia)
  .delete(deleteServicioEmergencia);

module.exports = router;
