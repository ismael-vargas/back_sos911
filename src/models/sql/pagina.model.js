// models/sql/pagina.model.js
const paginaModel = (sequelize, type) => {
    return sequelize.define('pagina', {
        id: {
            type: type.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombrePagina: {
            type: type.STRING,
            allowNull: false,
            comment: 'Nombre principal del sitio web o aplicación'
        },
        descripcionPagina: type.TEXT,
        estado: type.STRING,
        fecha_creacion: type.STRING,
        fecha_modificacion: type.STRING,
    }, {
        timestamps: false,
        comment: 'Tabla con los datos relacionales y de autenticación de usuarios'
    });
};

module.exports = paginaModel; // Exporta como función