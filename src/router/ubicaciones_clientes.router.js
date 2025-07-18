//ubicaciones_clientes.router.js

const express = require('express');
const router = express.Router();

const {
  createClientLocation,   // Cambiado de crearUbicacionCliente
  getAllClientLocations,  // Cambiado de getUbicacionesCliente
  getClientLocationById,  // Cambiado de getUbicacionClienteById
  updateClientLocation,   // Cambiado de updateUbicacionCliente
  deleteClientLocation    // Cambiado de deleteUbicacionCliente
} = require('../controller/ubicaciones_clientes.controller');

// --- Rutas con Nombres de Acción Explícitos ---

// Ruta para crear una nueva ubicación de cliente
// URL final: POST /ubicaciones_clientes/crear
router.post('/crear', createClientLocation);

// Ruta para listar todas las ubicaciones de cliente
// URL final: GET /ubicaciones_clientes/listar
router.get('/listar', getAllClientLocations);

// Ruta para obtener una ubicación específica por su ID
// URL final: GET /ubicaciones_clientes/detalle/123
router.get('/detalle/:id', getClientLocationById);

// Ruta para actualizar una ubicación por su ID
// URL final: PUT /ubicaciones_clientes/actualizar/123
router.put('/actualizar/:id', updateClientLocation);

// Ruta para eliminar una ubicación por su ID
// URL final: DELETE /ubicaciones_clientes/eliminar/123
router.delete('/eliminar/:id', deleteClientLocation);

module.exports = router;
