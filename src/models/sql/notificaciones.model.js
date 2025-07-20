// Definición del modelo "notificaciones" para Sequelize (ORM)
const notificaciones = (sequelize, type) => {
    return sequelize.define('notificaciones', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de notificación'
        },        
        recibido: type.INTEGER, // Simplificado a tipo BOOLEAN
        respuesta: type.INTEGER, // Simplificado a tipo BOOLEAN
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla de notificaciones'
    });
};

module.exports = notificaciones;
