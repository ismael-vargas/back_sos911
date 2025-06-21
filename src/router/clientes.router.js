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

// Rutas para clientes
router.post('/registro-clientes', crearCliente);               // Crear cliente
router.post('/login-clientes', loginCliente);                  // Login de cliente
router.get('/clientes', getClientes);                          // Obtener todos los clientes
router.get('/clientes/:id', getClienteById);                   // Obtener cliente por ID
router.put('/clientes/:id', updateCliente);                    // Actualizar cliente por ID
router.delete('/clientes/:id', deleteCliente);                 // Eliminar cliente (lógicamente)

// Rutas para preferencias del cliente
router.post('/clientes/:id/preferencias', registrarPreferenciasCliente);          // Crear preferencias
router.put('/clientes/:id/preferencias', actualizarPreferenciasCliente);          // Actualizar preferencias
router.put('/clientes/:id/preferencias/eliminar', eliminarPreferenciasCliente);   // Eliminar o reactivar preferencias
router.get('/clientes/:id/preferencias', getClienteConPreferencias);              // Obtener cliente + preferencias

module.exports = router;
