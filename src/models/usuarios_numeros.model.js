// Definición del modelo "usuarios_numeros" para Sequelize (ORM)
const usuario_numero = (sequelize, type) => {
    const UsuarioNumero = sequelize.define('usuarios_numeros', {
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
        nombre: {
            type: type.STRING,
            allowNull: false,
            comment: 'Nombre del contacto'
        },
        numero: {
            type: type.STRING,
            allowNull: false,
            comment: 'Número del contacto'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del número del usuario'
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
        comment: 'Tabla de números de usuarios'
    });

    return UsuarioNumero;
};

module.exports = usuario_numero;
