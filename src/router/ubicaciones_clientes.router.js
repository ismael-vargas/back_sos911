//ubicaciones_clientes.router.js
const express = require('express');
const router = express.Router();
const {
  crearUbicacionCliente,
  getUbicacionesCliente,
  getUbicacionClienteById,
  updateUbicacionCliente,
  deleteUbicacionCliente
} = require('../controller/ubicaciones_clientes.controller');

// Rutas agrupadas para ubicaciones-clientes
router.route('/')
  .post(crearUbicacionCliente)
  .get(getUbicacionesCliente);

router.route('/:id')
  .get(getUbicacionClienteById)
  .put(updateUbicacionCliente)
  .delete(deleteUbicacionCliente);

module.exports = router;
