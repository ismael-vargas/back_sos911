// clientes.model.js (para MongoDB)
const mongoose = require('mongoose');

const clientesMongoSchema = new mongoose.Schema({
    idClienteSql: String,
    direccion: String, // Cambiado a String simple
    fecha_nacimiento: String, // Cambiado a String
    estado: String, // Cambiado a String simple, eliminando enum y default
    fecha_creacion: String, // Cambiado a String
    fecha_modificacion: String // Cambiado a String
});

// Modelo 'Cliente' (singular) -> Colección 'clientes' (plural)
const Cliente = mongoose.model('Cliente', clientesMongoSchema);

module.exports = Cliente;
