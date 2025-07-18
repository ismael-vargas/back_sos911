// mensajes_grupo.model.js (para MongoDB)
const mongoose = require('mongoose');

const mensajesGrupoMongoSchema = new mongoose.Schema({
    grupoId: String, 
    clienteId: String, 
    mensaje: String, 
    tipo_mensaje: String,
    fecha_envio: String, 
    estado: String, 
    fecha_creacion: String, 
    fecha_modificacion: String 
});

// Modelo 'MensajeGrupo' (singular) -> Colección 'mensajegrupos' (plural por defecto de Mongoose)
const MensajeGrupo = mongoose.model('MensajeGrupo', mensajesGrupoMongoSchema);

module.exports = MensajeGrupo;
