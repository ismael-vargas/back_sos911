const usuario = (sequelize, type) => {
    return sequelize.define('usuarios', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de usuario'
        },
        nombre: {
            type: type.STRING,
            allowNull: false,
            comment: 'Nombre del usuario'
        },
        correo_electronico: {
            type: type.STRING,
            allowNull: false,
            unique: true,
            comment: 'Correo de usuario'
        },
        cedula_identidad: {
            type: type.STRING,
            unique: true,
            comment: 'Cédula de identidad del usuario'
        },
        direccion: {
            type: type.STRING,
            comment: 'Dirección del usuario'
        },
        contrasena_hash: {
            type: type.STRING,
            allowNull: false,
            comment: 'Contraseña del usuario en formato hash'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del usuario, puede ser activo o eliminado'
        },
    }, {
        timestamps: false,
        comment: 'Tabla de usuarios',
        indexes: [
            {
                unique: true,
                fields: ['correo_electronico']
            },
            {
                unique: true,
                fields: ['cedula_identidad']
            }
        ]
    });
}

module.exports = usuario;
