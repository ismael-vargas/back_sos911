const express = require('express');
const router = express.Router();
const {crearUsuario,getUsuarios,getUsuarioById,updateUsuario,deleteUsuario} = require('../controller/usuario.controller'); // Ajusta la ruta según tu estructura de carpetas

router.post('/registro', crearUsuario);
router.get('/usuarios', getUsuarios);
router.get('/usuarios/:id', getUsuarioById);
router.put('/usuarios/:id', updateUsuario);
router.delete('/usuarios/:id', deleteUsuario);


module.exports = router;
