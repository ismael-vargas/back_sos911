const express = require('express');
const router = express.Router();
const {crearUsuario,getUsuarios,getUsuarioById,updateUsuario,deleteUsuario,registrarPreferencias,getUsuarioConPreferencias,actualizarPreferencias,eliminarPreferencias} = require('../controller/usuario.controller');

router.post('/registro', crearUsuario);
router.get('/usuarios', getUsuarios);
router.get('/usuarios/:id', getUsuarioById);
router.put('/usuarios/:id', updateUsuario);
router.delete('/usuarios/:id', deleteUsuario);
router.post('/usuarios/:id/preferencias', registrarPreferencias); // ✅ NUEVA RUTA
router.put('/usuarios/:id/preferencias', actualizarPreferencias);
router.put('/usuarios/:id/preferencias/eliminar', eliminarPreferencias);
router.get('/usuarios/:id/preferencias', getUsuarioConPreferencias); // 👈 AGREGAR ESTA LÍNEA


module.exports = router;
