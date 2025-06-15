const clienteNumero = (sequelize, type) => {
    return sequelize.define('clientes_numeros', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del cliente número'
        },
        cliente_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'clientes',
                key: 'id'
            },
            comment: 'ID del cliente relacionado'
        },
        numero: {
            type: type.STRING(20),
            comment: 'Número asociado al cliente'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            defaultValue: 'activo',
            comment: 'Estado del número de cliente'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de números de clientes'
    });
  };
  
  module.exports = clienteNumero;