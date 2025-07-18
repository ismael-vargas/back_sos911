// usuarios.model.js (para MongoDB)
const mongoose = require('mongoose');

const usuariosMongoSchema = new mongoose.Schema({
    idUsuarioSql: String,
    fecha_nacimiento: String, 
    direccion: String, 
    estado: String, 
    fecha_creacion: String, 
    fecha_modificacion: String 
});

// Modelo 'Usuario' (singular) -> Colección 'usuarios' (plural)
const Usuario = mongoose.model('Usuario', usuariosMongoSchema);

module.exports = Usuario;
