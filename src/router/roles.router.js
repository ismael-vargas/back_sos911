const express = require('express');
const router = express.Router();
const {crearRol, getRoles, getRolById, updateRol, deleteRol } = require('../controller/roles.controller'); // Ajusta la ruta según tu estructura de carpetas

router.post('/roles', crearRol);
router.get('/roles', getRoles);
router.get('/roles/:id', getRolById);
router.put('/roles/:id', updateRol);
router.delete('/roles/:id', deleteRol);

module.exports = router;