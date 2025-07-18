// router/pagina.router.js
const express = require('express');
const router = express.Router();

// Importa el controlador de página que manejará la lógica de SQL y MongoDB.
// NOTA: Asegúrate de que tu 'pagina.controller.js' tenga las funciones
// 'getPagina', 'createPagina', 'getPaginaById', 'updatePagina', 'deletePagina'
const {
    getPagina,        // Para listar (obtener la configuración de la página única)
    createPagina,     // Para crear la configuración de la página
    getPaginaById,    // Para obtener detalles de la página por ID
    updatePagina,     // Para actualizar la configuración de la página por ID
    deletePagina      // Para eliminar la configuración de la página por ID
} = require('../controller/pagina.controller');

// --- Rutas para la Configuración de Página (SQL y MongoDB combinadas) ---

// Ruta para crear/inicializar la información de la página
// URL final: POST /pagina/crear
router.post('/crear', createPagina);

// Ruta para listar la información de la página (asumiendo una configuración única)
// URL final: GET /pagina/listar
router.get('/listar', getPagina);

// Ruta para obtener un servicio específico por su ID
// URL final: GET /pagina/detalle/:id
router.get('/detalle/:id', getPaginaById);

// Ruta para actualizar un servicio por su ID
// URL final: PUT /pagina/actualizar/:id
router.put('/actualizar/:id', updatePagina);

// Ruta para eliminar un servicio por su ID
// URL final: DELETE /pagina/eliminar/:id
router.delete('/eliminar/:id', deletePagina);

module.exports = router;
