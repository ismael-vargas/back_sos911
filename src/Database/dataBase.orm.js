const { Sequelize } = require("sequelize");
const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT, MYSQL_URI } = require("../keys");

let sequelize;

// Usar URI de conexión si está disponible
if (MYSQL_URI) {
    sequelize = new Sequelize(MYSQL_URI, {
        dialect: 'mysql',
        dialectOptions: {
            charset: 'utf8mb4', // Soporte para caracteres especiales y emojis
        },
        pool: {
            max: 20,
            min: 5,
            acquire: 30000,
            idle: 10000
        },
        logging: false
    });
} else {
    // Configuración para parámetros individuales
    sequelize = new Sequelize(MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD, {
        host: MYSQLHOST,
        port: MYSQLPORT,
        dialect: 'mysql',
        dialectOptions: {
            charset: 'utf8mb4',
        },
        pool: {
            max: 20,
            min: 5,
            acquire: 30000,
            idle: 10000
        },
        logging: false
    });
}
 
// Autenticación de la conexión
sequelize.authenticate()
    .then(() => {
        console.log("✅ Conexión establecida con la base de datos.");
    })
    .catch((err) => {
        console.error("❌ No se pudo conectar a la base de datos:", err.message);
    });

// Sincronización Segura de la Base de Datos
const syncOptions = process.env.NODE_ENV === 'development' ? { force: true } : { alter: true };

sequelize.sync(syncOptions)
    .then(() => {
        console.log('✅ Base de Datos y tablas sincronizadas.');
    })
    .catch((error) => {
        console.error('❌ Error al sincronizar la Base de Datos:', error);
    });

// --- Extracción de Modelos ---
const dispositivosModel = require('../models/sql/dispositivos.model');
const evaluacionesSituacionModel = require('../models/sql/evaluaciones_situaciones.model');
const gruposModel = require('../models/sql/grupos.model');
const usuarioModel = require('../models/sql/usuarios.model');
const rolModel = require('../models/sql/roles.model');
const usuarioNumeroModel = require('../models/sql/usuarios_numeros.model');
const ubicacionClientesModel = require('../models/sql/ubicaciones_clientes.model');
const clienteModel =require('../models/sql/clientes.model');
const cliente_gruposModel =require('../models/sql/clientes_grupos');
const cliente_numeroModel =require('../models/sql/clientes_numeros');
const contactosClientesModel =require('../models/sql/contactos_clientes.model');
const contactosEmergenciaModel =require('../models/sql/contactos_emergencias.model');
const mensajesGrupoModel = require('../models/sql/mensajes_grupo.model');
const informesEstadisticasModel = require ('../models/sql/informes_estadisticas.model');
const notificacionesModel = require ('../models/sql/notificaciones.model');
const presionesBotonPanicosModel = require('../models/sql/presiones_boton_panico.model');
const usuariosRolesModel = require('../models/sql/usuarios_roles.model');
const serviciosEmergenciaModel = require('../models/sql/servicios_emergencia');
const preferenciasModel = require('../models/sql/preferencias.model'); 
const contenidoAppModel = require('../models/sql/contenido_app.model'); 
const paginaModel = require('../models/sql/pagina.model'); 

// --- Instanciación de Modelos ---
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
const mensajes_grupo = mensajesGrupoModel(sequelize, Sequelize);
const informes_estadisticas = informesEstadisticasModel(sequelize, Sequelize);
const notificaciones = notificacionesModel(sequelize, Sequelize);
const presiones_boton_panico = presionesBotonPanicosModel(sequelize, Sequelize);
const usuarios_roles = usuariosRolesModel(sequelize, Sequelize);
const servicios_emergencia = serviciosEmergenciaModel(sequelize, Sequelize);
const preferencias = preferenciasModel(sequelize, Sequelize); 
const contenido_app = contenidoAppModel(sequelize, Sequelize); 
const pagina = paginaModel(sequelize, Sequelize);

// ==================================================================
//                      DEFINICIÓN DE RELACIONES
// ================================================================== //

// --- Relaciones de Usuario y Roles ---
// Un usuario puede tener múltiples roles a través de la tabla intermedia 'usuarios_roles'.
usuario.hasMany(usuarios_roles);
usuarios_roles.belongsTo(usuario);

rol.hasMany(usuarios_roles);
usuarios_roles.belongsTo(rol);

// Un usuario puede tener múltiples números de teléfono.
usuario.hasMany(usuario_numero);
usuario_numero.belongsTo(usuario);

// Un usuario tiene un único conjunto de preferencias.
usuario.hasOne(preferencias);
preferencias.belongsTo(usuario);

// Un usuario (administrador/operador) puede gestionar múltiples servicios de emergencia.
usuario.hasMany(servicios_emergencia);
servicios_emergencia.belongsTo(usuario);


// --- Relaciones de Cliente, Grupos y Dispositivos ---
// Un cliente es el creador/propietario de un grupo.
cliente.hasMany(grupos);
grupos.belongsTo(cliente);

// Relación Muchos a Muchos entre Cliente y Grupos a través de 'clientes_grupos'.
cliente.hasMany(clientes_grupos);
clientes_grupos.belongsTo(cliente);

grupos.hasMany(clientes_grupos);
clientes_grupos.belongsTo(grupos);

// Un cliente puede tener múltiples números de teléfono.
cliente.hasMany(clientes_numeros);
clientes_numeros.belongsTo(cliente);

// Un cliente puede tener múltiples dispositivos asociados.
cliente.hasMany(dispositivos);
dispositivos.belongsTo(cliente);


// --- Relaciones de Flujo de Pánico, Ubicación y Notificaciones ---
// Un cliente puede tener múltiples ubicaciones registradas.
cliente.hasMany(ubicacion_cliente);
ubicacion_cliente.belongsTo(cliente);

// Un cliente puede generar múltiples presiones del botón de pánico.
cliente.hasMany(presiones_boton_panico);
presiones_boton_panico.belongsTo(cliente);

// Una ubicación específica puede estar asociada a múltiples presiones del botón de pánico.
ubicacion_cliente.hasMany(presiones_boton_panico);
presiones_boton_panico.belongsTo(ubicacion_cliente);

// Una presión de pánico puede generar múltiples notificaciones.
presiones_boton_panico.hasMany(notificaciones);
notificaciones.belongsTo(presiones_boton_panico);

// Un cliente puede recibir múltiples notificaciones.
cliente.hasMany(notificaciones);
notificaciones.belongsTo(cliente);

// Una notificación puede tener múltiples evaluaciones de situación.
notificaciones.hasMany(evaluaciones_situacion);
evaluaciones_situacion.belongsTo(notificaciones);

// Una presión de pánico puede generar múltiples informes estadísticos.
presiones_boton_panico.hasMany(informes_estadisticas);
informes_estadisticas.belongsTo(presiones_boton_panico);


// --- Relaciones de Contactos de Emergencia y del Cliente ---
// Un cliente puede tener múltiples contactos de emergencia.
cliente.hasMany(contactos_emergencia);
contactos_emergencia.belongsTo(cliente);

// Un cliente puede tener múltiples registros de envío de notificaciones a contactos de emergencia.
// Esta tabla 'contactos_clientes' registra el evento de que un cliente envió/registró una notificación
// a un contacto de emergencia específico.
cliente.hasMany(contactos_clientes);
contactos_clientes.belongsTo(cliente);

// Un contacto de emergencia puede estar vinculado a un registro de envío de notificación.
contactos_emergencia.hasMany(contactos_clientes);
contactos_clientes.belongsTo(contactos_emergencia);

// Una notificación puede ser enviada a múltiples registros de contactos de clientes de emergencia.
notificaciones.hasMany(contactos_clientes);
contactos_clientes.belongsTo(notificaciones);


// --- Relaciones de Mensajería en Grupos ---
// Un mensaje pertenece a un grupo y un grupo tiene muchos mensajes.
mensajes_grupo.belongsTo(grupos);
grupos.hasMany(mensajes_grupo);

// Un mensaje es enviado por un cliente y un cliente puede enviar muchos mensajes.
mensajes_grupo.belongsTo(cliente);
cliente.hasMany(mensajes_grupo);

// ==================================================================
 
// Exportar todos los modelos
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
    mensajes_grupo,
    informes_estadisticas,
    notificaciones,
    presiones_boton_panico,
    usuarios_roles,
    servicios_emergencia,
    preferencias, 
    contenido_app, 
    pagina,
};
