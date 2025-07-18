// Definición del modelo "mensajes_grupo" para Sequelize (ORM)
const mensajesGrupo = (sequelize, type) => {
    return sequelize.define('mensajes_grupo', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'ID único del registro de metadatos del mensaje en SQL'
        },
        mongoMessageId: { // Campo para almacenar el _id del documento de mensaje en MongoDB
            type: type.STRING, // El _id de MongoDB es un string
            allowNull: false,
            unique: true, // Asegura que cada registro SQL apunte a un único mensaje de Mongo
            comment: 'ID del documento de mensaje correspondiente en MongoDB'
        },
        tipo_mensaje: type.STRING, // Cambiado a tipo STRING
        fecha_envio: type.STRING, // Cambiado a tipo STRING
        estado: type.STRING, // Simplificado a tipo STRING
        fecha_creacion: type.STRING, // Simplificado a tipo STRING
        fecha_modificacion: type.STRING, // Simplificado a tipo STRING
    }, {
        timestamps: false, // Sequelize no gestionará automáticamente createdAt/updatedAt
        comment: 'Tabla de metadatos de mensajes en los grupos (contenido en MongoDB)'
    });
};

module.exports = mensajesGrupo;
