// Definición del modelo "notificaciones" para Sequelize (ORM)
const notificaciones = (sequelize, type) => {
    return sequelize.define('notificaciones', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de notificación'
        },
        presion_boton_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model:'presiones_boton_panicos',
                key:'id'
            },
            comment: 'ID de la presión del botón de pánico por cliente'
        },
        
        cliente_notificado_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model:'clientes',
                key:'id',
            },
            comment: 'ID del cliente notificado'
        },
        
        recibido: {
            type: type.BOOLEAN,
            defaultValue: false,
            comment: 'Indica si la notificación ha sido recibida'
        },
        respuesta: {
            type: type.BOOLEAN,
            defaultValue: false,
            comment: 'Indica si se ha recibido una respuesta'
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
        comment: 'Tabla de notificaciones'
    });
};

module.exports = notificaciones;