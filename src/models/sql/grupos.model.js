// Definición del modelo "grupos" para Sequelize (ORM)
const grupos = (sequelize, type) => { 
    return sequelize.define('grupos', {
        id: {
            type: type.INTEGER, 
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de grupos'
        },
        nombre: {
            type: type.STRING, 
            allowNull: false,
            comment: 'Nombre de grupo'
        },
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        ultimo_mensaje_fecha: type.STRING, // Cambiado DataTypes a type y a STRING
        total_mensajes: type.INTEGER, // Cambiado DataTypes a type y a INTEGER
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla de grupos'
    });
}

module.exports = grupos;
