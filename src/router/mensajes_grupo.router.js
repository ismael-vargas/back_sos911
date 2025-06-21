const express = require('express');
const router = express.Router();
const { crearMensaje, getMensajesPorGrupo, deleteMensaje } = require('../controller/mensajes_grupo.controller');

router.post('/mensajes-grupo', crearMensaje); // Crear un nuevo mensaje
router.get('/mensajes-grupo/:grupo_id', getMensajesPorGrupo); // Obtener mensajes por grupo
router.delete('/mensajes-grupo/:id', deleteMensaje); // Eliminar un mensaje

module.exports = router;