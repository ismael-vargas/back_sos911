// Definición del modelo "clientes_numeros" para Sequelize (ORM)
const clienteNumero = (sequelize, type) => {
    return sequelize.define('clientes_numeros', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del cliente número'
        },
        nombre: {
            type: type.STRING,
            allowNull: false,
            comment: 'Detalle del número (ej: Principal, Casa, Trabajo, Móvil)'
        },
        numero: type.STRING, // Simplificado a tipo STRING
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING

    }, {
        timestamps: false,
        comment: 'Tabla de números de clientes'
    });
};

module.exports = clienteNumero;
