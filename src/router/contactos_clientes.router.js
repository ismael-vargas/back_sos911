const express = require('express');
const router = express.Router();
const {crearContactosCliente,getContactosClientes,getContactosClienteById,updateContactosCliente,deleteContactosCliente} = require('../controller/contactos_clientes.controller');

router.post('/contactos_clientes', crearContactosCliente); // Ruta para crear un nuevo contacto de cliente
router.get('/contactos_clientes', getContactosClientes); // Ruta para obtener todos los contactos de clientes
router.get('/contactos_clientes/:id', getContactosClienteById); // Ruta para obtener un contacto de cliente por ID
router.put('/contactos_clientes/:id', updateContactosCliente); // Ruta para actualizar un contacto de cliente por ID
router.delete('/contactos_clientes/:id', deleteContactosCliente); // Ruta para borrar un contacto de cliente por ID

module.exports = router;
