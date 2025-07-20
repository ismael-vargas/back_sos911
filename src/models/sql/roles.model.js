// Definición del modelo "roles" para Sequelize (ORM)
const rol = (sequelize, type) => {
    return sequelize.define('roles', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de rol' // Se mantiene el comentario para el ID
        },
        nombre: {
            type: type.STRING,
            allowNull: false, 
            comment: 'Nombre de rol' 
        },
        estado: type.STRING, 
        fecha_creacion: type.STRING, 
        fecha_modificacion: type.STRING, 
    }, {
        timestamps: false,
        comment: 'Tabla que define los roles del sistema'
    });
};

module.exports = rol;
