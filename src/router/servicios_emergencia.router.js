// servicios_emergencia.router.js

const express = require('express');
const router = express.Router();

const {
  createEmergencyService,   
  getAllEmergencyServices, 
  getEmergencyServiceById,  
  updateEmergencyService,  
  deleteEmergencyService   
} = require('../controller/servicios_emergencia.controller');

// Ruta para crear un nuevo servicio de emergencia
// URL final: POST /servicios_emergencia/crear
router.post('/crear', createEmergencyService);

// Ruta para listar todos los servicios de emergencia
// URL final: GET /servicios_emergencia/listar
router.get('/listar', getAllEmergencyServices);

// Ruta para obtener un servicio específico por su ID
// URL final: GET /servicios_emergencia/detalle/123
router.get('/detalle/:id', getEmergencyServiceById);

// Ruta para actualizar un servicio por su ID
// URL final: PUT /servicios_emergencia/actualizar/123
router.put('/actualizar/:id', updateEmergencyService);

// Ruta para eliminar un servicio por su ID
// URL final: DELETE /servicios_emergencia/eliminar/123
router.delete('/eliminar/:id', deleteEmergencyService);

module.exports = router;
