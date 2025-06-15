const express = require('express');
const router = express.Router();
const {
    createContactoEmergencia,
    getContactosEmergencias,
    getContactoEmergenciaById,
    updateContactoEmergencia,
    deleteContactoEmergencia
} = require('../controller/contactos_emergencias.controller');

router.post('/contactos-emergencias', createContactoEmergencia);
router.get('/contactos-emergencias', getContactosEmergencias);
router.get('/contactos-emergencias/:id', getContactoEmergenciaById);
router.put('/contactos-emergencias/:id', updateContactoEmergencia);
router.delete('/contactos-emergencias/:id', deleteContactoEmergencia);

module.exports = router;