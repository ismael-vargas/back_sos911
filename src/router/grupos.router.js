//grupos.router.js
const express = require('express');
const router = express.Router();

const {
  createGroup,  
  getAllGroups, 
  getGroupById, 
  updateGroup,  
  deleteGroup    
} = require('../controller/grupos.controller');

// Ruta para crear un nuevo grupo
// URL final: POST /grupos/crear
router.post('/crear', createGroup);

// Ruta para listar todos los grupos
// URL final: GET /grupos/listar
router.get('/listar', getAllGroups);

// Ruta para obtener un grupo específico por su ID
// URL final: GET /grupos/detalle/123
router.get('/detalle/:id', getGroupById);

// Ruta para actualizar un grupo por su ID
// URL final: PUT /grupos/actualizar/123
router.put('/actualizar/:id', updateGroup);

// Ruta para eliminar un grupo por su ID
// URL final: DELETE /grupos/eliminar/123
router.delete('/eliminar/:id', deleteGroup);

module.exports = router;
