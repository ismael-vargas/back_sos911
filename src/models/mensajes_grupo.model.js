// Definición del modelo "mensajes_grupo" para Sequelize (ORM)
const mensajesGrupo = (sequelize, type) => {
    return sequelize.define('mensajes_grupo', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del mensaje'
        },
        grupo_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'grupos',
                key: 'id'
            },
            comment: 'ID del grupo al que pertenece el mensaje'
        },
        cliente_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'clientes',
                key: 'id'
            },
            comment: 'ID del cliente que envió el mensaje'
        },
        mensaje: {
            type: type.TEXT,
            allowNull: false,
            comment: 'Contenido del mensaje'
        },
        fecha_envio: {
            type: type.DATE,
            allowNull: false,
            defaultValue: type.NOW,
            comment: 'Fecha y hora en que se envió el mensaje'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del mensaje (activo/eliminado)'
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
        comment: 'Tabla de mensajes en los grupos'
    });
};

module.exports = mensajesGrupo;