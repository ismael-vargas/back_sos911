//contactos_emergencias.router.js
const express = require('express');
const router = express.Router();
const {
  createContactoEmergencia,
  getContactosEmergencias,
  getContactoEmergenciaById,
  updateContactoEmergencia,
  deleteContactoEmergencia,
  getContactosByCliente
} = require('../controller/contactos_emergencias.controller');

// Rutas agrupadas para contactos de emergencias
router.route('/')
  .post(createContactoEmergencia)
  .get(getContactosEmergencias);

// Ruta para obtener contactos por cliente
router.route('/cliente/:cliente_id')
  .get(getContactosByCliente);

router.route('/:id')
  .get(getContactoEmergenciaById)
  .put(updateContactoEmergencia)
  .delete(deleteContactoEmergencia);

module.exports = router;