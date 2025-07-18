// dispositivos.router.js 
const express = require('express');
const router = express.Router();

const {
  createDevice,   
  getAllDevices, 
  getDeviceById,  
  updateDevice,   
  deleteDevice    
} = require('../controller/dispositivos.controller');

// Ruta para crear un nuevo dispositivo
// URL final: POST /dispositivos/crear
router.post('/crear', createDevice);

// Ruta para listar todos los dispositivos
// URL final: GET /dispositivos/listar
router.get('/listar', getAllDevices);

// Ruta para obtener un dispositivo específico por su ID
// URL final: GET /dispositivos/detalle/123
router.get('/detalle/:id', getDeviceById);

// Ruta para actualizar un dispositivo por su ID
// URL final: PUT /dispositivos/actualizar/123
router.put('/actualizar/:id', updateDevice);

// Ruta para eliminar un dispositivo por su ID
// URL final: DELETE /dispositivos/eliminar/123
router.delete('/eliminar/:id', deleteDevice);

module.exports = router;
