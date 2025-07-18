const mongoose = require('mongoose');

const ContenidoAppSchema = new mongoose.Schema({
    idContenidoAppSql: String,
    keySection: String,
    titleSection: String,
    contentSection: String,
    logoApp: String,
    estado: String,
    fecha_creacion: String,
    fecha_modificacion: String
}, {
    collection: 'contenido_app',
    timestamps: false 
});


const ContenidoApp = mongoose.model('ContenidoApp', ContenidoAppSchema);

// Exporta el modelo 'ContenidoApp' 
module.exports = ContenidoApp;