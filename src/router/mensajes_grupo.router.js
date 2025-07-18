// mensajes_grupo.router.js 
const express = require('express');
const router = express.Router();

const {
  createGroupMessage,  
  getMessagesByGroup,  
  updateGroupMessage,   
  deleteGroupMessage   
} = require('../controller/mensajes_grupo.controller');

// Ruta para crear un nuevo mensaje en un grupo
// El ID del grupo y del cliente vendrán en el cuerpo (body) de la petición.
// URL final: POST /mensajes_grupo/crear
router.post('/crear', createGroupMessage);

// Ruta para listar todos los mensajes de un grupo específico
// URL final: GET /mensajes_grupo/listar/por-grupo/123
router.get('/listar/por-grupo/:grupo_id', getMessagesByGroup);

// Ruta para actualizar un mensaje por su ID
// URL final: PUT /mensajes_grupo/actualizar/123
router.put('/actualizar/:id', updateGroupMessage);

// Ruta para eliminar un mensaje por su ID
// URL final: DELETE /mensajes_grupo/eliminar/123
router.delete('/eliminar/:id', deleteGroupMessage);

module.exports = router;
