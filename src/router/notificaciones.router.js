const express = require('express');
const router = express.Router();
const notificacionesController = require('../controller/notificaciones.controller');

router.get('/notificaciones', notificacionesController.getNotificaciones);
router.post('/notificaciones', notificacionesController.crearNotificacion);
router.get('/notificaciones/:id', notificacionesController.getNotificacionById);
router.put('/notificaciones/:id', notificacionesController.updateNotificacion);
router.delete('/notificaciones/:id', notificacionesController.deleteNotificacion);

module.exports = router;