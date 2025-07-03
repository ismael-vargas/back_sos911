// Definición del modelo "grupos" para Sequelize (ORM)
const grupos = (sequelize, type) => {
    return sequelize.define('grupos', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de grupos'
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
        nombre: {
            type: type.STRING,
            allowNull: false,
            comment: 'Nombre de grupo'
        },
        descripcion: {
            type: type.STRING,
            allowNull: true,
            comment: 'Descripción del grupo'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del grupo'
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
        comment: 'Tabla de grupos'
    });
}

module.exports = grupos;
