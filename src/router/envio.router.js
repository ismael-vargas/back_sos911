// envio.router.js
const express = require("express");
const router = express.Router();

const isLoggedIn = require('../lib/auth'); 
const { sendUsuario, sendArchivos, sendCliente } = require('../controller/guardadoArchivos');

router.post('/imagenUsuario', isLoggedIn, sendUsuario);
router.post('/archivosUsuario', isLoggedIn, sendArchivos);
router.post('/imagenCliente', isLoggedIn, sendCliente);

module.exports = router;