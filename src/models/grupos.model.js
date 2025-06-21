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
        }
    }, {
        timestamps: false,
        comment: 'Tabla de grupos'
    });
}

module.exports = grupos;
