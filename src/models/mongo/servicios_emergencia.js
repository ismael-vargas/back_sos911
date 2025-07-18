// servicios_emergencia.model.js (para MongoDB)
const mongoose = require('mongoose');

const serviciosEmergenciaMongoSchema = new mongoose.Schema({
    idServicioEmergenciaSql: String,
    descripcion: String, 
    estado: String, 
    fecha_creacion: String,
    fecha_modificacion: String 
});

// Modelo 'ServicioEmergencia' (singular) -> Colección 'servicioemergencias' (plural)
const ServicioEmergencia = mongoose.model('ServicioEmergencia', serviciosEmergenciaMongoSchema);

module.exports = ServicioEmergencia;
