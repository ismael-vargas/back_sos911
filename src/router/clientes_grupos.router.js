//clientes_grupos.router.js
const express = require('express');
const router = express.Router();
const {
  crearClientesGrupo,
  getClientesGrupos,
  getClientesGrupoById,
  updateClientesGrupo,
  deleteClientesGrupo
} = require('../controller/clientes_grupos.controller');

// Rutas agrupadas para grupos de clientes
router.route('/')
  .post(crearClientesGrupo)
  .get(getClientesGrupos);

router.route('/:id')
  .get(getClientesGrupoById)
  .put(updateClientesGrupo)
  .delete(deleteClientesGrupo);

module.exports = router;
