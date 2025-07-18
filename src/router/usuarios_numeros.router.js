//usuarios_numeros.router.js
const express = require('express');
const router = express.Router();

const {
  createUserNumber,   
  getAllUserNumbers,  
  getUserNumberById, 
  updateUserNumber,  
  deleteUserNumber   
} = require('../controller/usuarios_numeros.controller');

// Ruta para crear un nuevo número de usuario
// URL final: POST /usuarios_numeros/crear
router.post('/crear', createUserNumber);

// Ruta para listar todos los números de usuario
// URL final: GET /usuarios_numeros/listar
router.get('/listar', getAllUserNumbers);

// Ruta para obtener un número específico por su ID
// URL final: GET /usuarios_numeros/detalle/123
router.get('/detalle/:id', getUserNumberById);

// Ruta para actualizar un número por su ID
// URL final: PUT /usuarios_numeros/actualizar/123
router.put('/actualizar/:id', updateUserNumber);

// Ruta para eliminar un número por su ID
// URL final: DELETE /usuarios_numeros/eliminar/123
router.delete('/eliminar/:id', deleteUserNumber);

module.exports = router;