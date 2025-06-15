const usuariosRoles = (sequelize, type) => {
    return sequelize.define('usuarios_roles', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de asignación de roles a usuarios'
        },
        usuario_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'usuarios',
                key: 'id'
            },
            comment: 'ID del usuario relacionado'
        },
        rol_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'roles',
                key: 'id'
            },
            comment: 'ID del rol relacionado'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado de la asignación de rol'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de asignación de roles a usuarios'
    });
};

module.exports = usuariosRoles;
