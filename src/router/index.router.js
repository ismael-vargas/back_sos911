// index.router.js
const express = require('express');
const { mostrar, login, mostrarRegistro, registro, CerrarSesion } = require('../controller/index.controller');
const router = express.Router();

// --- Rutas Principales y de Autenticación ---
// Estas son rutas de acción individuales y ya son descriptivas.

router.get('/', mostrar)
router.post('/login', login)
router.get('/Register', mostrarRegistro)
router.post('/Register', registro)
router.get('/closeSection', CerrarSesion)

module.exports = router