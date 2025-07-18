// Definición del modelo "contenido_app" para Sequelize (ORM)
const contenidoApp = (sequelize, type) => {
    return sequelize.define('contenido_app', { // El nombre del modelo sigue siendo singular 'contenido_app'
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del registro de contenido de la app'
        },
        gradientStart: type.STRING, // color de inicio del degradado de la app
        gradientEnd: type.STRING, // color de fin del degradado de la app
        fontFamily: type.STRING, // Tipo de letra de la app
        mainTitle: type.STRING, // Titulo de la app
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        tableName: 'contenido_apps', 
        timestamps: false, 
        comment: 'Tabla con la configuración principal de la apariencia de la app'
    });
};

module.exports = contenidoApp;
