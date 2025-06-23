//notificaciones.router.js
const express = require('express');
const router = express.Router();
const notificacionesController = require('../controller/notificaciones.controller');

// Rutas agrupadas para notificaciones
router.route('/')
  .get(notificacionesController.getNotificaciones)
  .post(notificacionesController.crearNotificacion);

router.route('/:id')
  .get(notificacionesController.getNotificacionById)
  .put(notificacionesController.updateNotificacion)
  .delete(notificacionesController.deleteNotificacion);

module.exports = router;