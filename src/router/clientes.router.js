//clientes.router.js
const express = require('express');
const router = express.Router();

const {
  crearCliente,
  getClientes,
  getClienteById,
  updateCliente,
  deleteCliente,
  loginCliente,
  registrarPreferenciasCliente,
  getClienteConPreferencias,
  actualizarPreferenciasCliente,
  eliminarPreferenciasCliente
} = require('../controller/clientes.controller');

// Registro y login de clientes
router.post('/registro', crearCliente);
router.post('/login', loginCliente);

// Rutas agrupadas para clientes
router.route('/')
  .get(getClientes);

router.route('/:id')
  .get(getClienteById)
  .put(updateCliente)
  .delete(deleteCliente);

// Rutas agrupadas para preferencias del cliente
router.route('/:id/preferencias')
  .post(registrarPreferenciasCliente)
  .put(actualizarPreferenciasCliente)
  .get(getClienteConPreferencias);

router.put('/:id/preferencias/eliminar', eliminarPreferenciasCliente);

module.exports = router;
