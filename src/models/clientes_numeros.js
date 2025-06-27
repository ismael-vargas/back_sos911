// Definición del modelo "clientes_numeros" para Sequelize (ORM)
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
        nombre: {
            type: type.STRING(100),
            allowNull: false,
            comment: 'Nombre asociado al número del cliente'
        },
        numero: {
            type: type.STRING(20),
            comment: 'Número asociado al cliente'
        },
        descripcion: {
            type: type.STRING(255),
            allowNull: true,
            comment: 'Descripción del número del cliente'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            defaultValue: 'activo',
            comment: 'Estado del número de cliente'
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
        comment: 'Tabla de números de clientes'
    });
};

module.exports = clienteNumero;