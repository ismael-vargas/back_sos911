// Definición del modelo "usuarios_numeros" para Sequelize (ORM)
const usuario_numero = (sequelize, type) => {
    const UsuarioNumero = sequelize.define('usuarios_numeros', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de números del usuario' 
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
        estado: type.STRING, 
        fecha_creacion: type.STRING, 
        fecha_modificacion: type.STRING,
    }, {
        timestamps: false,
        comment: 'Tabla de números de usuarios'
    });

    return UsuarioNumero;
};

module.exports = usuario_numero;
