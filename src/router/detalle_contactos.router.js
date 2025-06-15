const express = require('express');
const router = express.Router();
const {
    createDetalleContacto,
    getDetallesContactos,
    getDetalleContactoById,
    updateDetalleContacto,
    deleteDetalleContacto
} = require('../controller/detalle_contactos.controller');

router.post('/detalle-contactos', createDetalleContacto);
router.get('/detalle-contactos', getDetallesContactos);
router.get('/detalle-contactos/:id', getDetalleContactoById);
router.put('/detalle-contactos/:id', updateDetalleContacto);
router.delete('/detalle-contactos/:id', deleteDetalleContacto);

module.exports = router;
