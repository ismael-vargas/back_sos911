//notificaciones.router.js
const express = require('express');
const router = express.Router();

const {
  createNotification,      
  getAllNotifications,    
  getNotificationById,    
  updateNotification,   
  deleteNotification     
} = require('../controller/notificaciones.controller');

// Ruta para crear una nueva notificación
// URL final: POST /notificaciones/crear
router.post('/crear', createNotification);

// Ruta para listar todas las notificaciones
// URL final: GET /notificaciones/listar
router.get('/listar', getAllNotifications);

// Ruta para obtener una notificación específica por su ID
// URL final: GET /notificaciones/detalle/123
router.get('/detalle/:id', getNotificationById);

// Ruta para actualizar una notificación por su ID
// URL final: PUT /notificaciones/actualizar/123
router.put('/actualizar/:id', updateNotification);

// Ruta para eliminar una notificación por su ID
// URL final: DELETE /notificaciones/eliminar/123
router.delete('/eliminar/:id', deleteNotification);

module.exports = router;