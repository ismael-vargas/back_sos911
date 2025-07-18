// Definición del modelo "presiones_boton_panico" para Sequelize (ORM)
const presionesBotonPanico = (sequelize, type) => {
    return sequelize.define('presiones_boton_panicos', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de presión de botón de pánico'
        },
        marca_tiempo: type.STRING, // Simplificado a tipo STRING
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla de presiones del botón de pánico (clientes)'
    });
}

module.exports = presionesBotonPanico;
