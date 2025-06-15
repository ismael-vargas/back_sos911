const rol = (sequelize, type) => {
    return sequelize.define('roles', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de rol'
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
        nombre: {
            type: type.STRING,
            comment: 'Nombre de rol'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del rol'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de roles'
    });
};

module.exports = rol;