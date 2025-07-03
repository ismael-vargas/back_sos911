const mongoose = require('mongoose');

const ContenidoAppSchema = new mongoose.Schema({
  gradientStart: { type: String, default: '#026b6b' }, // Color del Degradado (Inicio)
  gradientEnd: { type: String, default: '#2D353C' },   // Color del Degradado (Fin)
  fontFamily: {
    type: String,
    enum: ['Open Sans', 'Roboto', 'Montserrat', 'Arial'],
    default: 'Open Sans'
  },
  mainTitle: { type: String, default: '' }, // Título Principal
  sections: [
    {
      key: { type: String, required: true }, // Ej: howItWorks, mission, vision
      title: { type: String, required: true },
      content: { type: String, default: '' } // Eliminado 'required: true' aquí
    }
  ],
  estado: {
    type: String,
    enum: ['activo', 'eliminado'],
    required: true,
    default: 'activo',
    comment: 'Estado del contenido'
  },
  fecha_creacion: {
    type: Date,
    required: true,
    default: Date.now,
    comment: 'Fecha de creación del registro'
  },
  fecha_modificacion: {
    type: Date,
    required: true,
    default: Date.now,
    comment: 'Fecha de última modificación del registro'
  }
}, { timestamps: true, collection: 'contenidoapp2' });

module.exports = mongoose.model('ContenidoApp2', ContenidoAppSchema);
