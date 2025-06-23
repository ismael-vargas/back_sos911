const express = require('express');
const router = express.Router();
const {
  crearMensaje,
  getMensajesPorGrupo,
  deleteMensaje,
  editarMensaje
} = require('../controller/mensajes_grupo.controller');

// Crear un nuevo mensaje
router.post('/', crearMensaje);

// Obtener todos los mensajes de un grupo (explícito)
router.get('/grupo/:grupo_id', getMensajesPorGrupo);

// Eliminar un mensaje por ID
router.delete('/:id', deleteMensaje);

// Editar un mensaje existente por ID
router.put('/:id', editarMensaje);

module.exports = router;
