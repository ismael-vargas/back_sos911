// Definición del modelo "dispositivos" para Sequelize (ORM)
const dispositivos = (sequelize, type) => {
    return sequelize.define('dispositivos', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de dispositivo cliente'
        },
        cliente_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'clientes',
                key: 'id'
            },
            comment: 'ID del cliente'
        },
        token_dispositivo: {
            type: type.STRING(255),
            allowNull: false,
            comment: 'Token del dispositivo (cifrado)'
        },
        tipo_dispositivo: {
            type: type.STRING(100),
            allowNull: false,
            comment: 'Tipo de dispositivo (cifrado)'
        },
        modelo_dispositivo: {
            type: type.STRING(100),
            allowNull: false,
            comment: 'Modelo del dispositivo (cifrado)'
        },
        estado: {
            type: type.ENUM('activo', 'inactivo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del dispositivo'
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
        comment: 'Tabla de dispositivos para clientes'
    });
}

module.exports = dispositivos;

