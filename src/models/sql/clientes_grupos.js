// Definición del modelo "clientes_grupos" para Sequelize (ORM)
const clienteGrupo = (sequelize, type) => {
    return sequelize.define('clientes_grupos', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único de la relación cliente-grupo'
        },
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla intermedia que une clientes y grupos'
    });
};
 
module.exports = clienteGrupo;
