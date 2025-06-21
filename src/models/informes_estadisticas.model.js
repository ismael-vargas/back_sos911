// Definición del modelo "informes_estadisticas" para Sequelize (ORM)
const informesEstadisticas = (sequelize, type) => {
    return sequelize.define('informes_estadisticas', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de informe de estadísticas'
        },
        presion_boton_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'presiones_boton_panicos',
                key: 'id'
            },
            comment: 'Id del boton relacionado'
        },
        numero_notificaciones: {
            type: type.INTEGER,
            comment: 'Número de notificaciones generadas'
        },
        numero_respuestas: {
            type: type.INTEGER,
            comment: 'Número de respuestas recibidas'
        },
        evaluaciones_SOS: {
            type: type.INTEGER,
            comment: 'Número de evaluaciones SOS'
        },
        evaluaciones_911: {
            type: type.INTEGER,
            comment: 'Número de evaluaciones 911'
        },
        evaluaciones_innecesaria: {
            type: type.INTEGER,
            comment: 'Número de evaluaciones innecesarias'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del informe de estadísticas'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de informes y estadísticas'
    });
};

module.exports = informesEstadisticas;
