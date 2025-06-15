const clienteGrupo = (sequelize, type) => {
    return sequelize.define('clientes_grupos', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del cliente grupo'
        },
        grupo_id: {
            type: type.INTEGER,
            references: {
                model: 'grupos_clientes',
                key: 'id'
            },
            comment: 'ID del grupo relacionado'
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
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            defaultValue: 'activo',
            comment: 'Estado del grupo del cliente'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de clientes y grupos'
    });
  };
  
  module.exports = clienteGrupo;