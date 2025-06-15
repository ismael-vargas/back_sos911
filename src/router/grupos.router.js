const express = require('express');
const router = express.Router();
const { 
    crearGrupo, 
    getGrupos, 
    getGrupoById, 
    updateGrupo, 
    deleteGrupo 
} = require('../controller/grupos.controller'); // Asegúrate de que la ruta sea correcta

// Rutas para grupos
router.post('/grupos', crearGrupo);
router.get('/grupos', getGrupos);
router.get('/grupos/:id', getGrupoById);
router.put('/grupos/:id', updateGrupo);
router.delete('/grupos/:id', deleteGrupo);

module.exports = router;
