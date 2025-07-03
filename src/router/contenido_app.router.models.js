const express = require('express');
const router = express.Router();
const contenidoAppCtl = require('../controller/contenido_app.controller');

// GET: Obtener el contenido global
router.get('/api/mobile-content', contenidoAppCtl.getContenido);

// PUT: Actualizar el contenido global
router.put('/api/mobile-content', contenidoAppCtl.updateContenido);

// PATCH: Cambiar el estado del contenido global
router.patch('/api/mobile-content/estado', contenidoAppCtl.cambiarEstado);

module.exports = router;
