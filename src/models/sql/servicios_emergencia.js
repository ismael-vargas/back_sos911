// Modelo servicios_emergencia para Sequelize (ORM)
const serviciosEmergencia = (sequelize, type) => { // Cambiado DataTypes a type
    return sequelize.define('servicios_emergencia', {
        id: {
            type: type.INTEGER, // Cambiado DataTypes a type
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del servicio de emergencia' 
        },
        nombre: {
            type: type.STRING,
            allowNull: false,
            comment: 'Nombre del servicio de emergencia (cifrado)'
        },
        
        telefono: {
            type: type.STRING, 
            allowNull: false,
            comment: 'Teléfono del servicio de emergencia (cifrado)'
        },
        estado: type.STRING,
        fecha_creacion: type.STRING, 
        fecha_modificacion: type.STRING,
    }, {
        timestamps: false,
        comment: 'Tabla de servicios de emergencia públicos'
    });
};

module.exports = serviciosEmergencia;
