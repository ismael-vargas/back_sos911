//contactos_emergencias.router.js
const express = require('express');
const router = express.Router();

// Importa las funciones directamente del controlador
// Asegúrate de que los nombres coincidan exactamente con lo que se exporta en el controlador
const {
  createEmergencyContact,  
  getAllEmergencyContacts,  
  getEmergencyContactById, 
  updateEmergencyContact,   
  deleteEmergencyContact,  
  getContactsByClient       
} = require('../controller/contactos_emergencias.controller');

// --- Rutas con Nombres de Acción Explícitos ---

// Ruta para crear un nuevo contacto de emergencia
// URL final: POST /contactos_emergencias/crear
router.post('/crear', createEmergencyContact);

// Ruta para listar todos los contactos de emergencia
// URL final: GET /contactos_emergencias/listar
router.get('/listar', getAllEmergencyContacts);

// Ruta especial para obtener todos los contactos de un cliente específico
// URL final: GET /contactos_emergencias/listar/por-cliente/:clienteId
// CORREGIDO: Se cambió de :cliente_id a :clienteId para consistencia con el controlador
router.get('/listar/por-cliente/:clienteId', getContactsByClient);

// Ruta para obtener un contacto específico por su ID
// URL final: GET /contactos_emergencias/detalle/123
router.get('/detalle/:id', getEmergencyContactById);

// Ruta para actualizar un contacto por su ID
// URL final: PUT /contactos_emergencias/actualizar/123
router.put('/actualizar/:id', updateEmergencyContact);

// Ruta para eliminar un contacto por su ID
// URL final: DELETE /contactos_emergencias/eliminar/123
router.delete('/eliminar/:id', deleteEmergencyContact);

module.exports = router;
