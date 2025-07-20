// Definición del modelo "clientes" para Sequelize (ORM)
const cliente = (sequelize, type) => { // Cambiado DataTypes a type
    return sequelize.define('clientes', {
        id: {
            type: type.INTEGER, // Cambiado DataTypes a type
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del cliente'
        },
        nombre: {
            type: type.STRING, // Cambiado DataTypes a type
            allowNull: false,
            comment: 'Nombre del cliente'
        },
        correo_electronico: {
            type: type.STRING, // Cambiado DataTypes a type
            allowNull: false,
            comment: 'Correo electrónico del cliente'
        },
        cedula_identidad: {
            type: type.STRING, // Cambiado DataTypes a type
            comment: 'Cédula de identidad del cliente'
        },
        numero_ayudas: type.INTEGER, // Simplificado a tipo INTEGER
        contrasena_hash: {
            type: type.STRING, // Cambiado DataTypes a type
            allowNull: false,
            comment: 'Hash de la contraseña del cliente'
        },
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla de clientes'
    });
};

module.exports = cliente;
