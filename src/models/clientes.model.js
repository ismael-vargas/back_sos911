// Definición del modelo "clientes" para Sequelize (ORM)
const cliente = (sequelize, type) => {
    return sequelize.define('clientes', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del cliente'
        },
        nombre: {
            type: type.STRING(100),
            allowNull: false,
            comment: 'Nombre del cliente'
        },
        correo_electronico: {
            type: type.STRING(255),
            allowNull: false,
            comment: 'Correo electrónico del cliente'
        },
        correo_hash: {
            type: type.STRING(255),
            allowNull: false,
            unique: true,
            comment: 'Hash SHA256 del correo para búsquedas seguras'
        },
        cedula_identidad: {
            type: type.STRING(100),
            comment: 'Cédula de identidad del cliente'
        },
        direccion: {
            type: type.STRING(255),
            comment: 'Dirección del cliente'
        },
        numero_ayudas: {
            type: type.INTEGER,
            defaultValue: 0,
            comment: 'Número de ayudas recibidas por el cliente'
        },
        contrasena_hash: {
            type: type.STRING(255),
            allowNull: false,
            comment: 'Hash de la contraseña del cliente'
        },
        estado_eliminado: {
            type: type.ENUM('activo', 'eliminado'),
            defaultValue: 'activo',
            comment: 'Estado de eliminación del cliente'
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
        comment: 'Tabla de clientes',
        indexes: [
          {
              unique: true,
              fields: ['correo_electronico']
          },
          {
              unique: true,
              fields: ['cedula_identidad']
          },
          {
              unique: true,
              fields: ['correo_hash']
          }
      ]
    });
};

module.exports = cliente;
