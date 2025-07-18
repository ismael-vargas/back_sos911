// Definición del modelo "evaluaciones_situaciones" para Sequelize (ORM)
const evaluacionesSituaciones = (sequelize, type) => {
    return sequelize.define('evaluaciones_situaciones', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de evaluación de situaciones'
        },
        evaluacion: type.STRING, // Cambiado de ENUM a STRING
        detalle: type.TEXT, // Simplificado a tipo TEXT
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla de evaluaciones de situaciones'
    });
}

module.exports = evaluacionesSituaciones;
