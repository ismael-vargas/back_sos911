// clientes.router.js 
const express = require('express');
const router = express.Router();

const {
  createClient,      
  getAllClients,     
  getClientById,     
  updateClient,     
  deleteClient,     
  loginClient,       
  deviceLoginHandler  
} = require('../controller/clientes.controller');

// --- Rutas Individuales (Acciones Específicas) ---
// Estas rutas ya son descriptivas y es correcto que tengan su propio endpoint.

// Ruta para registrar un nuevo cliente
// URL final: POST /clientes/registro
router.post('/registro', createClient);

// Ruta para el login de un cliente
// URL final: POST /clientes/login
router.post('/login', loginClient);

// Ruta para el login desde un dispositivo
// URL final: POST /clientes/device-login
router.post('/device-login', deviceLoginHandler);

// --- Rutas de Agrupación (CRUD Estándar) ---

// Ruta para listar todos los clientes
// URL final: GET /clientes/listar
router.get('/listar', getAllClients);

// Ruta para obtener un cliente específico por su ID
// URL final: GET /clientes/detalle/123
router.get('/detalle/:id', getClientById);

// Ruta para actualizar un cliente por su ID
// URL final: PUT /clientes/actualizar/123
router.put('/actualizar/:id', updateClient);

// Ruta para eliminar un cliente por su ID
// URL final: DELETE /clientes/eliminar/123
router.delete('/eliminar/:id', deleteClient);

module.exports = router;
