// Definición del modelo "informes_estadisticas" para Sequelize (ORM)
const informesEstadisticas = (sequelize, type) => {
    return sequelize.define('informes_estadisticas', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de informe de estadísticas'
        },
        numero_notificaciones: type.INTEGER, 
        numero_respuestas: type.INTEGER, 
        evaluaciones_SOS: type.INTEGER, 
        evaluaciones_911: type.INTEGER, 
        evaluaciones_innecesaria: type.INTEGER, 
        estado: type.STRING, 
        fecha_creacion: type.STRING, 
        fecha_modificacion: type.STRING, 
    }, {
        timestamps: false,
        comment: 'Tabla de informes y estadísticas'
    });
};

module.exports = informesEstadisticas;
