//usuarios_roles.router.js
const express = require('express');
const router = express.Router();
const {
  crearUsuarioRoles,
  getUsuariosRoles,
  getUsuarioRolById,
  updateUsuarioRol,
  deleteUsuarioRol
} = require('../controller/usuarios_roles.controller');

// Rutas agrupadas para usuarios-roles
router.route('/')
  .post(crearUsuarioRoles)
  .get(getUsuariosRoles);

router.route('/:id')
  .get(getUsuarioRolById)
  .put(updateUsuarioRol)
  .delete(deleteUsuarioRol);

module.exports = router;