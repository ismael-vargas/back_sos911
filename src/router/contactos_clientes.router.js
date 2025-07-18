//contactos_clientes.router.js
const express = require('express');
const router = express.Router();

const {
  createClientContact,  
  getAllClientContacts, 
  getClientContactById, 
  updateClientContact,   
  deleteClientContact   
} = require('../controller/contactos_clientes.controller');

// --- Rutas con Nombres de Acción Explícitos ---

// Ruta para crear un nuevo contacto de cliente
// URL final: POST /contactos_clientes/crear
router.post('/crear', createClientContact);

// Ruta para listar todos los contactos de clientes
// URL final: GET /contactos_clientes/listar
router.get('/listar', getAllClientContacts);

// Ruta para obtener un contacto específico por su ID
// URL final: GET /contactos_clientes/detalle/123
router.get('/detalle/:id', getClientContactById);

// Ruta para actualizar un contacto por su ID
// URL final: PUT /contactos_clientes/actualizar/123
router.put('/actualizar/:id', updateClientContact);

// Ruta para eliminar un contacto por su ID
// URL final: DELETE /contactos_clientes/eliminar/123
router.delete('/eliminar/:id', deleteClientContact);

module.exports = router;
