const { Sequelize } = require("sequelize");
const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT, MYSQL_URI } = require("../keys");

let sequelize;

// Usar URI de conexión si está disponible
if (MYSQL_URI) {
    sequelize = new Sequelize(MYSQL_URI);
} else {
    // Configuración para parámetros individuales
    sequelize = new Sequelize(MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD, {
        host: MYSQLHOST,
        port: MYSQLPORT,
        dialect: 'mysql',
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
        }
    });
}

// Autenticar y sincronizar
sequelize.authenticate()
    .then(() => {
        console.log("Conexión establecida con la base de datos");
    })
    .catch((err) => {
        console.error("No se pudo conectar a la base de datos:", err.message);
    });

/* sequelize.sync({ force: true })
    .then(() => {
        console.log("Tablas sincronizadas");
    })
    .catch((err) => {
        console.error("Error al sincronizar las tablas:", err.message);
    }); */

    

//extracionModelos

const dispositivosModel = require('../models/dispositivos.model');
const evaluacionesSituacionModel = require('../models/evaluaciones_situaciones.model');
const gruposModel = require('../models/grupos.model');
const usuarioModel = require('../models/usuarios.model');
const rolModel = require('../models/roles.model');
const usuarioNumeroModel = require('../models/usuarios_numeros.model');
const ubicacionClientesModel = require('../models/ubicaciones_clientes.model');
const clienteModel =require('../models/clientes.model');
const cliente_gruposModel =require('../models/clientes_grupos');
const cliente_numeroModel =require('../models/clientes_numeros');
const contactosClientesModel =require('../models/contactos_clientes.model');
const contactosEmergenciaModel =require('../models/contactos_emergencias.model');

const informesEstadisticasModel = require ('../models/informes_estadisticas.model');
const notificacionesModel = require ('../models/notificaciones.model');
const presionesBotonPanicosModel = require('../models/presiones_boton_panico.model');
const usuariosRolesModel = require('../models/usuarios_roles.model');



//Sincronia tablas
const dispositivos = dispositivosModel(sequelize, Sequelize);
const evaluaciones_situacion = evaluacionesSituacionModel(sequelize, Sequelize);
const grupos = gruposModel(sequelize, Sequelize);
const rol = rolModel(sequelize, Sequelize);
const ubicacion_cliente = ubicacionClientesModel(sequelize, Sequelize);
const usuario_numero = usuarioNumeroModel(sequelize, Sequelize);
const usuario = usuarioModel(sequelize, Sequelize);
const cliente = clienteModel(sequelize,Sequelize);
const clientes_grupos = cliente_gruposModel(sequelize,Sequelize);
const clientes_numeros = cliente_numeroModel(sequelize,Sequelize);
const contactos_clientes = contactosClientesModel(sequelize,Sequelize);
const contactos_emergencia = contactosEmergenciaModel(sequelize,Sequelize);

const informes_estadisticas = informesEstadisticasModel(sequelize, Sequelize);
const notificaciones = notificacionesModel(sequelize, Sequelize);
const presiones_boton_panico = presionesBotonPanicosModel(sequelize, Sequelize);
const usuarios_roles = usuariosRolesModel(sequelize, Sequelize);


// RELACIONES
usuario.belongsToMany(rol, { through: usuarios_roles, foreignKey: 'usuario_id' });
rol.belongsToMany(usuario, { through: usuarios_roles, foreignKey: 'rol_id' });

usuario.hasMany(rol, { foreignKey: 'usuario_id' });
rol.belongsTo(usuario, { foreignKey: 'usuario_id' });

usuario.hasMany(usuario_numero, { foreignKey: 'usuario_id' });
usuario_numero.belongsTo(usuario, { foreignKey: 'usuario_id' });

cliente.belongsToMany(grupos, { through: clientes_grupos, foreignKey: 'cliente_id' });
grupos.belongsToMany(cliente, { through: clientes_grupos, foreignKey: 'grupo_id' });

cliente.hasMany(ubicacion_cliente, { foreignKey: 'cliente_id' });
ubicacion_cliente.belongsTo(cliente, { foreignKey: 'cliente_id' });

cliente.hasMany(presiones_boton_panico, { foreignKey: 'cliente_id' });
presiones_boton_panico.belongsTo(cliente, { foreignKey: 'cliente_id' });

ubicacion_cliente.hasMany(presiones_boton_panico, { foreignKey: 'ubicacion_id' });
presiones_boton_panico.belongsTo(ubicacion_cliente, { foreignKey: 'ubicacion_id' });

presiones_boton_panico.hasMany(informes_estadisticas, { foreignKey: 'presion_boton_id' });
informes_estadisticas.belongsTo(presiones_boton_panico, { foreignKey: 'presion_boton_id' });

cliente.hasMany(clientes_numeros, { foreignKey: 'cliente_id' });
clientes_numeros.belongsTo(cliente, { foreignKey: 'cliente_id' });

cliente.hasMany(grupos, { foreignKey: 'cliente_id' });
grupos.belongsTo(cliente, { foreignKey: 'cliente_id' });

cliente.hasMany(dispositivos, { foreignKey: 'cliente_id' });
dispositivos.belongsTo(cliente, { foreignKey: 'cliente_id' });

cliente.hasMany(notificaciones, { foreignKey: 'cliente_notificado_id' });
notificaciones.belongsTo(cliente, { foreignKey: 'cliente_notificado_id' });

presiones_boton_panico.hasMany(notificaciones, { foreignKey: 'presion_boton_id' });
notificaciones.belongsTo(presiones_boton_panico, { foreignKey: 'presion_boton_id' });

notificaciones.hasMany(evaluaciones_situacion, { foreignKey: 'notificacion_id' });
evaluaciones_situacion.belongsTo(notificaciones, { foreignKey: 'notificacion_id' });

// Relaciones de contacto emergencia y contacto cliente
cliente.hasMany(contactos_emergencia, { foreignKey: 'cliente_id' });
contactos_emergencia.belongsTo(cliente, { foreignKey: 'cliente_id' });

cliente.hasMany(contactos_clientes, { foreignKey: 'cliente_id' });
contactos_clientes.belongsTo(cliente, { foreignKey: 'cliente_id' });

contactos_emergencia.hasMany(contactos_clientes, { foreignKey: 'contacto_id' });
contactos_clientes.belongsTo(contactos_emergencia, { foreignKey: 'contacto_id' });

notificaciones.hasMany(contactos_clientes, { foreignKey: 'notificacion_id' });
contactos_clientes.belongsTo(notificaciones, { foreignKey: 'notificacion_id' });



sequelize.sync({ alter: false }) // alter will update the database schema to match the model
    .then(() => {
        console.log('Database synchronized');
    })
    .catch((error) => {
        console.error('Error synchronizing the database:', error);
    });
 
    



// Exportar el objeto sequelize
module.exports = {
    rol,
    dispositivos,
    evaluaciones_situacion,
    grupos,
    ubicacion_cliente,
    usuario,
    usuario_numero,
    cliente,
    clientes_grupos,
    clientes_numeros,
    contactos_clientes,
    contactos_emergencia,
 
    informes_estadisticas,
    notificaciones,
    presiones_boton_panico,
    usuarios_roles, 

};