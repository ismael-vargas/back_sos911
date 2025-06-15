const express = require('express');
const router = express.Router();
const {
    crearClientesGrupo,
    getClientesGrupos,
    getClientesGrupoById,
    updateClientesGrupo,
    deleteClientesGrupo
} = require('../controller/clientes_grupos.controller');

router.post('/clientes-grupos', crearClientesGrupo); // Ruta para crear un nuevo grupo
router.get('/clientes-grupos', getClientesGrupos); // Ruta para obtener todos los grupos
router.get('/clientes-grupos/:id', getClientesGrupoById); // Ruta para obtener un grupo por ID
router.put('/clientes-grupos/:id', updateClientesGrupo); // Ruta para actualizar un grupo por ID
router.delete('/clientes-grupos/:id', deleteClientesGrupo); // Ruta para borrar un grupo por ID

module.exports = router;
