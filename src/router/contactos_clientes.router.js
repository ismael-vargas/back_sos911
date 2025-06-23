//contactos_clientes.router.js
const express = require('express');
const router = express.Router();

const {
    crearContactosCliente,
    getContactosClientes,
    getContactosClienteById,
    updateContactosCliente,
    deleteContactosCliente
} = require('../controller/contactos_clientes.controller');

// Rutas para contactos de clientes
router.post('/', crearContactosCliente);             // Crear nuevo contacto
router.get('/', getContactosClientes);               // Obtener todos los contactos
router.get('/:id', getContactosClienteById);        // Obtener contacto por ID
router.put('/:id', updateContactosCliente);         // Actualizar contacto por ID
router.delete('/:id', deleteContactosCliente);      // Borrar contacto por ID

module.exports = router;
