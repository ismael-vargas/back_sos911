// Definición del modelo "presiones_boton_panico" para Sequelize (ORM)
const presionesBotonPanico = (sequelize, type) => {
        return sequelize.define('presiones_boton_panicos', {
            id: {
                type: type.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                comment: 'Campo único de rol'
            },
            cliente_id: {
                type: type.INTEGER,
                allowNull: false,
                references: {
                    model: 'clientes',
                    key: 'id'
                },
                comment: 'Id del cliente relacionado'
            },
            ubicacion_id: {
                type: type.INTEGER,
                allowNull: false,
                references: {
                    model: 'ubicaciones_clientes',
                    key: 'id'
                },
                comment: 'Id de la ubicacion del cliente relacionado'
            },
            marca_tiempo: {
                type: type.DATE,
                defaultValue: type.NOW,
                comment: 'Marca de tiempo de la presión del botón'
            },
            fecha_creacion: {
            type: type.DATE,
            allowNull: false,
            defaultValue: type.literal('CURRENT_TIMESTAMP'),
            comment: 'Fecha de creación del registro'
        },
        fecha_modificacion: {
            type: type.DATE,
            allowNull: false,
            defaultValue: type.literal('CURRENT_TIMESTAMP'),
            comment: 'Fecha de última modificación del registro'
        }
        }, {
            timestamps: false,
            comment: 'Tabla de presiones del botón de pánico (clientes)'
        });
    }

    module.exports = presionesBotonPanico;