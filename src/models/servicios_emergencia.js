// Modelo servicios_emergencia para Sequelize (ORM)
const serviciosEmergencia = (sequelize, type) => {
    return sequelize.define('servicios_emergencia', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del servicio de emergencia'
        },
        usuario_id: {
            type: type.INTEGER,
            allowNull: false,
            comment: 'ID del usuario que crea el servicio',
        },
        nombre: {
            type: type.STRING(100),
            allowNull: false,
            comment: 'Nombre del servicio de emergencia'
        },
        descripcion: {
            type: type.STRING(255),
            allowNull: true,
            comment: 'Descripción del servicio de emergencia'
        },
        telefono: {
            type: type.STRING(30),
            allowNull: false,
            comment: 'Teléfono del servicio de emergencia'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            defaultValue: 'activo',
            allowNull: false,
            comment: 'Estado del servicio de emergencia'
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
        comment: 'Tabla de servicios de emergencia públicos'
    });
};

module.exports = serviciosEmergencia;
