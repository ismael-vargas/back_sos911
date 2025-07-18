// Definición del modelo "ubicaciones_clientes" para Sequelize (ORM)
// const { DataTypes } = require('sequelize'); // Eliminada esta línea ya que 'type' se pasa como argumento

const ubicacion_clientes = (sequelize, type) => { 
    return sequelize.define('ubicaciones_clientes', {
        id: {
            type: type.INTEGER, // Cambiado DataTypes a type
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de la ubicación del cliente' // Se mantiene el comentario para el ID
        },
        latitud: type.STRING, 
        longitud: type.STRING,
        marca_tiempo: type.STRING, 
        estado: type.STRING, 
        fecha_creacion: type.STRING, 
        fecha_modificacion: type.STRING,
    }, {
        timestamps: false,
        comment: 'Tabla de ubicaciones del cliente'
    });
}

module.exports = ubicacion_clientes;
