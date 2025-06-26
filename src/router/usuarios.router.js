//usuarios.router.js
const express = require('express');
const router = express.Router();
const {
  crearUsuario,
  getUsuarios,
  getUsuarioById,
  updateUsuario,
  deleteUsuario,
  registrarPreferencias,
  getUsuarioConPreferencias,
  actualizarPreferencias,
  eliminarPreferencias,
  loginUsuario
} = require('../controller/usuario.controller');

// Registro de usuario
router.post('/registro', crearUsuario);

// Login de usuario
router.post('/login', loginUsuario);

// Rutas agrupadas para usuarios
router.route('/')
  .get(getUsuarios); // GET /usuarios/

router.route('/:id')
  .get(getUsuarioById)    // GET /usuarios/:id
  .put(updateUsuario)     // PUT /usuarios/:id
  .delete(deleteUsuario); // DELETE /usuarios/:id

// Rutas agrupadas para preferencias del usuario
router.route('/:id/preferencias')
  .post(registrarPreferencias)      // POST /usuarios/:id/preferencias
  .put(actualizarPreferencias)      // PUT /usuarios/:id/preferencias
  .get(getUsuarioConPreferencias);  // GET /usuarios/:id/preferencias

router.put('/:id/preferencias/eliminar', eliminarPreferencias); // PUT /usuarios/:id/preferencias/eliminar

module.exports = router;
