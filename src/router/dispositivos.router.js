//dispositivos.router.js
const express = require('express');
const router = express.Router();
const {
  createDispositivo,
  getDispositivos,
  getDispositivoById,
  updateDispositivo,
  deleteDispositivo
} = require('../controller/dispositivos.controller');

// Rutas agrupadas para dispositivos
router.route('/')
  .post(createDispositivo)
  .get(getDispositivos);

router.route('/:id')
  .get(getDispositivoById)
  .put(updateDispositivo)
  .delete(deleteDispositivo);

module.exports = router;
