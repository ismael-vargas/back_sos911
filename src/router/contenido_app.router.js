// contenido_app.router.js 
const express = require('express');
const router = express.Router();

const {
  getContent,    
  createInitialContent, 
  updateContent, 
  changeStatus   
} = require('../controller/contenido_app.controller');

// --- Rutas con Nombres de Acción Explícitos ---

// NUEVO: Ruta para crear/inicializar el contenido global de la aplicación
// URL final: POST /contenido_app/crear
router.post('/crear', createInitialContent);

// Ruta para obtener el contenido global de la aplicación
// URL final: GET /contenido_app/obtener
router.get('/obtener', getContent);

// Ruta para actualizar completamente el contenido global
// URL final: PUT /contenido_app/actualizar
router.put('/actualizar', updateContent);

// Ruta para cambiar solo el estado del contenido (activo/eliminado)
// URL final: PATCH /contenido_app/cambiar-estado
router.patch('/cambiar-estado', changeStatus);

module.exports = router;
