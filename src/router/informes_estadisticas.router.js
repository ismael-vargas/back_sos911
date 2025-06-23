//informes_estadisticas.router.js
const express = require('express');
const router = express.Router();
const {
  crearInforme,
  getInformes,
  getInformeById,
  updateInforme,
  deleteInforme
} = require('../controller/informes_estadisticas.controller');

// Rutas agrupadas para informes
router.route('/')
  .post(crearInforme)
  .get(getInformes);

router.route('/:id')
  .get(getInformeById)
  .put(updateInforme)
  .delete(deleteInforme);

module.exports = router;
