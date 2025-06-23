//grupos.router.js
const express = require('express');
const router = express.Router();
const {
  crearGrupo,
  getGrupos,
  getGrupoById,
  updateGrupo,
  deleteGrupo
} = require('../controller/grupos.controller');

// Rutas agrupadas para grupos
router.route('/')
  .post(crearGrupo)
  .get(getGrupos);

router.route('/:id')
  .get(getGrupoById)
  .put(updateGrupo)
  .delete(deleteGrupo);

module.exports = router;
