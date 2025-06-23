const express = require("express");
const router = express.Router();

const { isLoggedIn } = require('../lib/auth');
const { sendUsuario, sendArchivos, sendCliente } = require('../controller/guardadoArchivos');

router.post('/imagenUsuario', sendUsuario);
router.post('/archivosUsuario', sendArchivos);
router.post('/imagenCliente', sendCliente);

module.exports = router;