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
            type: type.STRING,
            allowNull: false,
            comment: 'Token del dispositivo'
        },
        tipo_dispositivo: {
            type: type.ENUM('Android', 'iOS'),
            allowNull: false,
            comment: 'Tipo de dispositivo'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del dispositivo'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de dispositivos para clientes'
    });
}

module.exports = dispositivos;

