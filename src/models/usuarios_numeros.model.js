const usuario_numero = (sequelize, type) => {
    return sequelize.define('usuarios_numeros', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de números del usuario'
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
        numero: {
            type: type.STRING,
            comment: 'Número del usuario'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del número del usuario'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de números de usuarios'
    });
};

module.exports = usuario_numero;
