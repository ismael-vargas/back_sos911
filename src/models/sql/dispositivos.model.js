// Definición del modelo "dispositivos" para Sequelize (ORM)
const dispositivos = (sequelize, type) => {
    return sequelize.define('dispositivos', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de dispositivo cliente'
        },
        token_dispositivo: {
            type: type.STRING,
            allowNull: false,
            comment: 'Token del dispositivo (cifrado)'
        },
        tipo_dispositivo: {
            type: type.STRING,
            allowNull: false,
            comment: 'Tipo de dispositivo (cifrado)'
        },
        modelo_dispositivo: {
            type: type.STRING,
            allowNull: false,
            comment: 'Modelo del dispositivo (cifrado)'
        },
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false,
        comment: 'Tabla de dispositivos para clientes'
    });
}

module.exports = dispositivos;
