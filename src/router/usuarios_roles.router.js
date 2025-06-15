const express = require('express');
const router = express.Router();
const { crearUsuarioRoles, getUsuariosRoles, getUsuarioRolById, updateUsuarioRol, deleteUsuarioRol } = require('../controller/usuarios_roles.controller'); // Ajusta la ruta según tu estructura de carpetas

router.post('/usuarios-roles', crearUsuarioRoles);
router.get('/usuarios-roles', getUsuariosRoles);
router.get('/usuarios-roles/:id', getUsuarioRolById);
router.put('/usuarios-roles/:id', updateUsuarioRol);
router.delete('/usuarios-roles/:id', deleteUsuarioRol);

module.exports = router;