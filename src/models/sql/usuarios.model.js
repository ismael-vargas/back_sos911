// Definición del modelo "usuarios" para Sequelize (ORM)
const usuario = (sequelize, type) => { // Cambiado DataTypes a type
    return sequelize.define('usuarios', {
        id: {
            type: type.INTEGER, // Cambiado DataTypes a type
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de usuario' // Se mantiene el comentario para el ID
        },
        nombre: {
            type: type.STRING,
            allowNull: false,
            comment: 'Nombre completo del usuario'
        },
        correo_electronico: {
           type: type.STRING, // Cambiado DataTypes a type
            allowNull: false,
            comment: 'Correo electrónico del usuario cifrado o principal'
        },
        cedula_identidad: {
            type: type.STRING, // Cambiado DataTypes a type
            comment: 'Cédula de identidad o número de identificación del usuario'
        },
        contrasena_hash: {
            type: type.STRING,
            allowNull: false,
            comment: 'Contraseña del usuario en formato hash '
        },
        estado: type.STRING, 
        fecha_creacion: type.STRING, 
        fecha_modificacion: type.STRING, 
    }, {
        timestamps: false, 
        comment: 'Tabla con los datos relacionales y de autenticación de usuarios'
    });
};

// Exporta el modelo para que pueda ser utilizado por Sequelize
module.exports = usuario;
