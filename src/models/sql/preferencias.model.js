// Definición del modelo "preferencias" para Sequelize (ORM)
const preferencias = (sequelize, type) => {
    return sequelize.define('preferencias', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único de las preferencias'
        },
        tema: type.STRING, // Cambiado de ENUM a STRING
        estado: type.STRING, // Cambiado de ENUM a STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla para almacenar las preferencias de interfaz de los usuarios'
    });
};

module.exports = preferencias;
