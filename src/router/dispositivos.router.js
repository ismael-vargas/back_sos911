const express = require('express');
const router = express.Router();
const {
    createDispositivo,
    getDispositivos,
    getDispositivoById,
    updateDispositivo,
    deleteDispositivo
} = require('../controller/dispositivos.controller');

router.post('/dispositivos', createDispositivo);
router.get('/dispositivos', getDispositivos);
router.get('/dispositivos/:id', getDispositivoById);
router.put('/dispositivos/:id', updateDispositivo);
router.delete('/dispositivos/:id', deleteDispositivo);

module.exports = router;
