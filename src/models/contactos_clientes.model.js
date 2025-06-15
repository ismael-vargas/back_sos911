const contactosClientes = (sequelize, type) => {
    return sequelize.define('contactos_clientes', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de contacto de cliente'
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
        contacto_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'contactos_emergencias',
                key: 'id'
            },
            comment: 'ID del contacto de emergencia'
        },
        notificacion_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'notificaciones',
                key: 'id'
            },
            comment: 'ID de la notificación asociada'
        },
        estado: {
            type: type.STRING,
            defaultValue: 'activo',
            comment: 'Estado del contacto del cliente'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de contactos de los clientes'
    });
};

module.exports = contactosClientes;