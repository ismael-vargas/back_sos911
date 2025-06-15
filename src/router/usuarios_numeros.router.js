const express = require('express');
const router = express.Router();
const { crearUsuarioNumero, getUsuarioNumero, getUsuarioNumeroById, updateUsuarioNumero, deleteUsuarioNumero }  = require('../controller/usuarios_numeros.controller'); // Ajusta la ruta según tu estructura de carpetas

router.post('/usuario-numeros', crearUsuarioNumero);
router.get('/usuario-numeros', getUsuarioNumero);
router.get('/usuario-numero/:id', getUsuarioNumeroById);
router.put('/usuario-numero/:id', updateUsuarioNumero);
router.delete('/usuario-numero/:id', deleteUsuarioNumero);

module.exports = router;
