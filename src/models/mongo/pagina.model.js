// models/mongo/contenido_pagina.model.js (para MongoDB)
const mongoose = require('mongoose');

const ContenidoPaginaSchema = new mongoose.Schema({
    idPaginaSql: String, 
    mision: String, 
    vision: String,
    logoUrl: String, 
    estado: String, 
    fecha_creacion: String,
    fecha_modificacion: String 
}, {
    collection: 'pagina', // Se mantiene porque tu modelo original lo tenía
    timestamps: false // Se mantiene porque tu modelo original lo tenía
});

const ContenidoPagina = mongoose.model('ContenidoPagina', ContenidoPaginaSchema);

module.exports = ContenidoPagina;
