// Definición del modelo "usuarios_roles" para Sequelize (ORM)
const usuariosRoles = (sequelize, type) => {
    return sequelize.define('usuarios_roles', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de asignación de roles a usuarios' 
        },
        estado: type.STRING,
        fecha_creacion: type.STRING, 
        fecha_modificacion: type.STRING, 
    }, {
        timestamps: false,
        comment: 'Tabla intermedia que une usuarios y roles'
    });
};

module.exports = usuariosRoles;
