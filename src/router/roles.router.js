// roles.router.js

const express = require('express');
const router = express.Router();

// Nombres de funciones para que coincidan con el controlador
const {
  createRole,  
  getRoles,   
  getRolById, 
  updateRol,   
  deleteRol     
} = require('../controller/roles.controller');

// Agrupación para acciones que no necesitan un ID
router.route('/crear')
  .post(createRole); // URL final: POST /roles/crear

router.route('/listar')
  .get(getRoles);  // URL final: GET /roles/listar

// Agrupación para acciones que SÍ necesitan un ID
router.route('/detalle/:id')
  .get(getRolById); // URL final: GET /roles/detalle/123

router.route('/actualizar/:id')
  .put(updateRol); // URL final: PUT /roles/actualizar/123

router.route('/eliminar/:id')
  .delete(deleteRol); // URL final: DELETE /roles/eliminar/123

module.exports = router;
