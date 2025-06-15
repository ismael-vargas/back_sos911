const express = require('express');
const router = express.Router();
const {crearUbicacionCliente,getUbicacionesCliente, getUbicacionClienteById, updateUbicacionCliente, deleteUbicacionCliente} = require('../controller/ubicaciones_clientes.controller'); // Ajusta la ruta según tu estructura de carpetas

router.post('/ubicaciones-clientes', crearUbicacionCliente);
router.get('/ubicaciones-clientes', getUbicacionesCliente);
router.get('/ubicaciones-cliente/:id', getUbicacionClienteById);
router.put('/ubicaciones-cliente/:id', updateUbicacionCliente);
router.delete('/ubicaciones-cliente/:id', deleteUbicacionCliente);

module.exports = router;
