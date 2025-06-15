const express = require('express');
const router = express.Router();
const {crearCliente,getClientes,getClienteById,updateCliente,deleteCliente} = require('../controller/clientes.controller'); // Ajusta la ruta según tu estructura de carpetas

router.post('/registro-clientes', crearCliente);
router.get('/clientes', getClientes);
router.get('/clientes/:id', getClienteById);
router.put('/clientes/:id', updateCliente);
router.delete('/clientes/:id', deleteCliente);


module.exports = router;