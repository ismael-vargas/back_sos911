const express = require('express');
const { mostrar, login, mostrarRegistro, registro, CerrarSesion } = require('../controller/index.controller');
const router = express.Router();

router.get('/', mostrar)
router.post('/login', login)
router.get('/Register', mostrarRegistro)
router.post('/Register', registro)
router.get('/closeSection', CerrarSesion)



module.exports = router