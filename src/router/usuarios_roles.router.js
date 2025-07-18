//usuarios_roles.router.js

const express = require('express');
const router = express.Router();

const {
  assignRoleToUser,  
  getAllUserRoles,    
  getUserRoleById,    
  updateUserRole,     
  deleteUserRole      
} = require('../controller/usuarios_roles.controller');


// Ruta para asignar un rol a un usuario
// URL final: POST /usuarios_roles/asignar
router.post('/asignar', assignRoleToUser);

// Ruta para listar todas las asignaciones de roles
// URL final: GET /usuarios_roles/listar
router.get('/listar', getAllUserRoles);

// Ruta para obtener una asignación específica por su ID
// URL final: GET /usuarios_roles/detalle/123
router.get('/detalle/:id', getUserRoleById);

// Ruta para actualizar una asignación por su ID
// URL final: PUT /usuarios_roles/actualizar/123
router.put('/actualizar/:id', updateUserRole);

// Ruta para eliminar una asignación por su ID
// URL final: DELETE /usuarios_roles/eliminar/123
router.delete('/eliminar/:id', deleteUserRole);

module.exports = router;
