// clientes_numeros.router.js 
const express = require('express');
const router = express.Router();

const {
  createClientNumber, 
  getAllClientNumbers, 
  getClientNumberById,  
  updateClientNumber,   
  deleteClientNumber,  
  getNumbersByClientId 
} = require('../controller/clientes_numeros.controller');

// --- Rutas con Nombres de Acción Explícitos ---

// Ruta para crear un nuevo número de cliente
// URL final: POST /clientes_numeros/crear
router.post('/crear', createClientNumber);

// Ruta para listar todos los números de clientes
// URL final: GET /clientes_numeros/listar
router.get('/listar', getAllClientNumbers);

// Ruta especial para obtener todos los números de un cliente específico
// URL final: GET /clientes_numeros/listar/por-cliente/123
router.get('/listar/por-cliente/:cliente_id', getNumbersByClientId);

// Ruta para obtener un número específico por su ID
// URL final: GET /clientes_numeros/detalle/123
router.get('/detalle/:id', getClientNumberById);

// Ruta para actualizar un número por su ID
// URL final: PUT /clientes_numeros/actualizar/123
router.put('/actualizar/:id', updateClientNumber);

// Ruta para eliminar un número por su ID
// URL final: DELETE /clientes_numeros/eliminar/123
router.delete('/eliminar/:id', deleteClientNumber);

module.exports = router;
