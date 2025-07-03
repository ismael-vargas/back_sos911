//clientes_numeros.router.js
const express = require('express');
const router = express.Router();
const {
  crearClientesNumero,
  getClientesNumeros,
  getClientesNumeroById,
  updateClientesNumero,
  deleteClientesNumero,
  getNumerosByClienteId // <-- nuevo método
} = require('../controller/clientes_numeros.controller');

// Rutas agrupadas para números de clientes
router.route('/')
  .post(crearClientesNumero)
  .get(getClientesNumeros);

router.route('/:id')
  .get(getClientesNumeroById)
  .put(updateClientesNumero)
  .delete(deleteClientesNumero);

// Ruta para obtener los números de un cliente específico
router.get('/cliente/:cliente_id', getNumerosByClienteId);

module.exports = router;
