// roles.router.js
const express = require('express');
const router = express.Router();
const {
  crearRol,
  getRoles,
  getRolById,
  updateRol,
  deleteRol
} = require('../controller/roles.controller');

// Rutas agrupadas para roles
router.route('/')
  .post(crearRol)
  .get(getRoles);

router.route('/:id')
  .get(getRolById)
  .put(updateRol)
  .delete(deleteRol);

module.exports = router;