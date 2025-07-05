// Definición del modelo "preferencias" para Sequelize (ORM)
const mongoose = require('mongoose');

const PreferenciasSchema = new mongoose.Schema({
  usuarioId: {
    type: Number,
    required: true,
    unique: true, // Solo una preferencia por usuario
  },
  tema: {
    type: String,
    enum: ['oscuro', 'claro'],
    required: true,
    default: 'claro',
  },
  sidebarMinimizado: {
    type: Boolean,
    default: false,
  },
  estado: {
    type: String,
    enum: ['activo', 'eliminado'],
    default: 'activo',
  },
}, {
  timestamps: true,
  // Para futuras migraciones: usa mongoose-migrate o scripts para actualizar documentos existentes si cambias el esquema.
});

module.exports = mongoose.model('Preferencias', PreferenciasSchema);
