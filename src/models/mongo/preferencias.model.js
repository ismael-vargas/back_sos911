// preferencias.model.js (para MongoDB)
const mongoose = require('mongoose');

// Este esquema guardará las preferencias flexibles del usuario.
const preferenciasMongoSchema = new mongoose.Schema({
    idPreferenciaSql: String,
    sidebarMinimizado: String, // Cambiado a String simple
    estado: String, // Cambiado a String simple
    fecha_creacion: String, // Cambiado a String
    fecha_modificacion: String // Cambiado a String
});

const Preferencias = mongoose.model('Preferencias', preferenciasMongoSchema);

module.exports = Preferencias;
