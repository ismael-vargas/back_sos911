//clientes_numeros.router.js
const express = require('express');
const router = express.Router();
const {
  crearClientesNumero,
  getClientesNumeros,
  getClientesNumeroById,
  updateClientesNumero,
  deleteClientesNumero
} = require('../controller/clientes_numeros.controller');

// Rutas agrupadas para números de clientes
router.route('/')
  .post(crearClientesNumero)
  .get(getClientesNumeros);

router.route('/:id')
  .get(getClientesNumeroById)
  .put(updateClientesNumero)
  .delete(deleteClientesNumero);

module.exports = router;
