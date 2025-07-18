// usuarios.router.js 
const express = require('express');
const router = express.Router();

const {
  createUser,           
  getAllUsers,          
  getUserById,         
  updateUser,              
  deleteUser,            
  loginUser,             
  registerPreferences,    
  getUserWithPreferences,   
  updatePreferences,        
  deletePreferences       
} = require('../controller/usuario.controller');

// --- Rutas Individuales (Acciones Específicas de Autenticación) ---
// Estas rutas tienen un propósito único y es correcto que mantengan su nombre.

// Ruta para registrar un nuevo usuario
// URL final: POST /usuarios/registro
router.post('/registro', createUser);

// Ruta para el login de un usuario
// URL final: POST /usuarios/login
router.post('/login', loginUser);


// --- Rutas de Agrupación (CRUD Estándar para Usuarios) ---

// Ruta para listar todos los usuarios
// URL final: GET /usuarios/listar
router.get('/listar', getAllUsers);

// Ruta para obtener un usuario específico por su ID
// URL final: GET /usuarios/detalle/123
router.get('/detalle/:id', getUserById);

// Ruta para actualizar un usuario por su ID
// URL final: PUT /usuarios/actualizar/123
router.put('/actualizar/:id', updateUser);

// Ruta para eliminar un usuario por su ID
// URL final: DELETE /usuarios/eliminar/123
router.delete('/eliminar/:id', deleteUser);


// --- Rutas para el Sub-Recurso "Preferencias" de un Usuario ---

// Ruta para registrar/crear las preferencias de un usuario específico
// URL final: POST /usuarios/preferencias/registrar/123
router.post('/preferencias/registrar/:id', registerPreferences);

// Ruta para obtener las preferencias de un usuario específico
// URL final: GET /usuarios/preferencias/listar/123
router.get('/preferencias/listar/:id', getUserWithPreferences);

// Ruta para actualizar las preferencias de un usuario específico
// URL final: PUT /usuarios/preferencias/actualizar/123
router.put('/preferencias/actualizar/:id', updatePreferences);

// Ruta para eliminar (borrado lógico) las preferencias de un usuario específico
// URL final: DELETE /usuarios/preferencias/eliminar/123
router.delete('/preferencias/eliminar/:id', deletePreferences);


module.exports = router;
