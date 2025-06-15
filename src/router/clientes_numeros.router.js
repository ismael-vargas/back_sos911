const express = require('express');
const router = express.Router();
const {
    crearClientesNumero,
    getClientesNumeros,
    getClientesNumeroById,
    updateClientesNumero,
    deleteClientesNumero
} = require('../controller/clientes_numeros.controller');

router.post('/numeros', crearClientesNumero); // Ruta para crear un nuevo número de cliente
router.get('/numeros', getClientesNumeros); // Ruta para obtener todos los números de clientes
router.get('/numeros/:id', getClientesNumeroById); // Ruta para obtener un número de cliente por ID
router.put('/numeros/:id', updateClientesNumero); // Ruta para actualizar un número de cliente por ID
router.delete('/numeros/:id', deleteClientesNumero); // Ruta para borrar un número de cliente por ID

module.exports = router;
