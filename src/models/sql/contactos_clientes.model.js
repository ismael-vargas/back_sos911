// Definición del modelo "contactos_clientes" para Sequelize (ORM)
const contactosClientes = (sequelize, type) => {
    return sequelize.define('contactos_clientes', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de contacto de cliente'
        },
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla de contactos de los clientes'
    });
};

module.exports = contactosClientes;
