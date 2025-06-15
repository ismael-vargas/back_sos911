const { DataTypes } = require('sequelize'); // Importa DataTypes directamente desde Sequelize

const ubicacion_clientes = (sequelize) => {
    return sequelize.define('ubicaciones_clientes', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de la ubicación del cliente'
        },
        cliente_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'clientes',
                key: 'id'
            },
            comment: 'Id del cliente relacionado'
        },
        latitud: {
            type: DataTypes.STRING,
            comment: 'Latitud'
        },
        longitud: {
            type: DataTypes.STRING,
            comment: 'Longitud'
        },
        marca_tiempo: {
            type: DataTypes.TIME, // Usa DataTypes para definir el tipo TIME
            comment: 'Marca tiempo'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de ubicaciones del cliente'
    });
}

module.exports = ubicacion_clientes;
