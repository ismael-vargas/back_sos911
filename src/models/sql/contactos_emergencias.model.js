// Definición del modelo "contactos_emergencias" para Sequelize (ORM)
const contactosEmergencias = (sequelize, type) => { 
    return sequelize.define('contactos_emergencias', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de contacto de emergencia del cliente'
        },
        nombre: type.STRING, // Simplificado a tipo STRING
        descripcion: type.TEXT, // Simplificado a tipo TEXT
        telefono: type.STRING, // Simplificado a tipo STRING
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla de contactos de emergencia para clientes'
    });
};

module.exports = contactosEmergencias;
