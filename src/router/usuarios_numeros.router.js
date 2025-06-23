//usuarios_numeros.router.js
const express = require('express');
const router = express.Router();
const {
  crearUsuarioNumero,
  getUsuarioNumero,
  getUsuarioNumeroById,
  updateUsuarioNumero,
  deleteUsuarioNumero
} = require('../controller/usuarios_numeros.controller');

// Rutas agrupadas para usuario-numeros
router.route('/')
  .post(crearUsuarioNumero)
  .get(getUsuarioNumero);

router.route('/:id')
  .get(getUsuarioNumeroById)
  .put(updateUsuarioNumero)
  .delete(deleteUsuarioNumero);

module.exports = router;
