const contactosEmergencias = (sequelize, type) => { 
    return sequelize.define('contactos_emergencias', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo único de contacto de emergencia del cliente'
        },
        cliente_id: {
            type: type.INTEGER,
            allowNull: false,
            references: {
                model: 'clientes',
                key: 'id'
            },
            comment: 'ID del cliente asociado'
        },
        nombre: {
            type: type.STRING,
            comment: 'Nombre del contacto de emergencia'
        },
        descripcion: {
            type: type.STRING,
            comment: 'Descripción del contacto de emergencia'
        },
        telefono: {
            type: type.STRING,
            comment: 'Número de teléfono del contacto de emergencia'
        },
        estado: {
            type: type.ENUM('activo', 'eliminado'),
            allowNull: false,
            defaultValue: 'activo',
            comment: 'Estado del contacto de emergencia'
        }
    }, {
        timestamps: false,
        comment: 'Tabla de contactos de emergencia para clientes'
    });
};

module.exports = contactosEmergencias;
//cambios realizados