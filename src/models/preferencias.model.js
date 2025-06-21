// Definición del modelo "preferencias" para Sequelize (ORM)
const mongoose = require('mongoose');

const PreferenciasSchema = new mongoose.Schema({
  usuarioId: {
    type: Number, // ID del usuario en MySQL
  },
  clienteId: {
    type: Number, // ID del cliente en MySQL
  },
  origen: {
    type: String,
    enum: ['usuario', 'cliente'], // para saber de quién es
    required: true,
  },
  tema: {
    type: String,
    required: true,
  },
  colores: {
    fondo: { type: String, required: true },
    texto: { type: String, required: true },
    botones: { type: String, required: true },
    sidebar: { type: String }, // si lo necesitas
    inicio: { type: String },  // color pantalla inicio
    botonPrincipal: { type: String }, // nuevo sugerido
    barraSuperior: { type: String },  // nuevo sugerido
  },
  fuente: {
    type: String, // tipo de letra
    default: 'Arial',
  },
  estado: {
    type: String,
    enum: ['activo', 'eliminado'],
    default: 'activo',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Preferencias', PreferenciasSchema);
