// Definición del modelo "usuarios" para Sequelize (ORM)
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
             type: type.TEXT, // Cambia DataTypes.TEXT por type.TEXT
            allowNull: false,
            unique: true,
            comment: 'Correo de usuario cifrado'
        },
        correo_hash: {
            type: type.STRING(64),
            allowNull: false,
            unique: true,
            comment: 'Hash SHA256 del correo para búsquedas seguras'
        },
        cedula_identidad: {
           type: type.STRING(255), 
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
        timestamps: true,  // Habilita timestamps automáticos
        createdAt: 'fecha_creacion',  // Mapea createdAt a fecha_creacion
        updatedAt: 'fecha_modificacion',  // Mapea updatedAt a fecha_modificacion
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