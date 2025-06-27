// Definición del modelo "evaluaciones_situaciones" para Sequelize (ORM)
const evaluacionesSituaciones = (sequelize, type) => {
    return sequelize.define('evaluaciones_situaciones', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de evaluación de situaciones'
        },
        notificacion_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'notificaciones',
                key: 'id' 
            },
            comment: 'ID de la notificación'
        },
        evaluacion: {
            type: type.ENUM('SOS', '911', 'Innecesaria'),
            allowNull: false,
            comment: 'Evaluación de la situación'
        },
        detalle: {
            type: type.TEXT,
            comment: 'Detalle de la evaluación'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado de la evaluación'
        },
        fecha_creacion: {
            type: type.DATE,
            allowNull: false,
            defaultValue: type.literal('CURRENT_TIMESTAMP'),
            comment: 'Fecha de creación del registro'
        },
        fecha_modificacion: {
            type: type.DATE,
            allowNull: false,
            defaultValue: type.literal('CURRENT_TIMESTAMP'),
            comment: 'Fecha de última modificación del registro'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de evaluaciones de situaciones'
    });
}

module.exports = evaluacionesSituaciones;
