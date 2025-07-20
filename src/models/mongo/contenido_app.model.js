const mongoose = require('mongoose');

const ContenidoAppSchema = new mongoose.Schema({
    idContenidoAppSql: String,
    // Campos para la primera sección
    howItWorksKey: String,
    howItWorksTitle: String,
    howItWorksContent: String,
    // Campos para la segunda sección (Misión)
    missionKey: String,
    missionTitle: String,
    missionContent: String,
    // Campos para la tercera sección (Visión)
    visionKey: String,
    visionTitle: String,
    visionContent: String,
    
    logoApp: String,
    estado: String,
    fecha_creacion: String,
    fecha_modificacion: String
}, {
    collection: 'contenido_app',
    timestamps: false 
});


const ContenidoApp = mongoose.model('ContenidoApp', ContenidoAppSchema);

module.exports = ContenidoApp;