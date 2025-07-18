// Configura Passport.js para autenticar usuarios y gestionar sesiones con estrategia local. (passport.js)
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fs = require('fs'); 
const path = require('path');
const axios = require('axios'); // Aunque axios no se usará para subida externa, se mantiene si hay otras llamadas HTTP
const FormData = require('form-data'); // Aunque FormData no se usará para subida externa, se mantiene si hay otros usos
const { validationResult } = require('express-validator'); // Para manejo de resultados de validación
// Archivos de conexión y modelos
const orm = require('../Database/dataBase.orm'); // Tu ORM (Sequelize) para interactuar con la DB SQL
const sql = require('../Database/dataBase.sql'); // Tu conexión SQL directa
const mongo = require('../Database/dataBase.mongo'); // Tu conexión a MongoDB (Mongoose)

// Importa las utilidades de cifrado/descifrado (asegúrate que tu encrypDates.js exporte estas funciones)
const { cifrarDato, descifrarDato } = require('./encrypDates'); 

// --- Función para guardar y subir archivos (fotos de perfil) ---
// Esta función maneja el movimiento del archivo localmente y actualiza la base de datos SQL con el nombre del archivo.
const guardarYSubirArchivo = async (archivo, filePath, photoColumnName, entityId, uploadUrl, req, Model) => {
    const validaciones = {
        imagen: [".PNG", ".JPG", ".JPEG", ".GIF", ".TIF", ".png", ".jpg", ".jpeg", ".gif", ".tif", ".ico", ".ICO", ".webp", ".WEBP"],
    };
    const validacion = path.extname(archivo.name);

    if (!validaciones.imagen.includes(validacion)) {
        throw new Error('Tipo de archivo no compatible. Solo se permiten imágenes.');
    }

    return new Promise((resolve, reject) => {
        // Mueve el archivo a la carpeta local
        archivo.mv(filePath, async (err) => {
            if (err) {
                console.error(`Error al guardar el archivo localmente (${filePath}):`, err.message);
                return reject(new Error('Error al guardar el archivo localmente.'));
            } else {
                try {
                    // Actualiza la base de datos SQL con el nombre del archivo
                    // Asume que la tabla del Model tiene una columna con el nombre de photoColumnName
                    await Model.update(
                        { [photoColumnName]: archivo.name }, // Usa el nombre de la columna dinámicamente
                        { where: { id: entityId } }
                    );
                    console.log(`Base de datos SQL actualizada con ${photoColumnName}: ${archivo.name} para ID: ${entityId}`);
                    
                    // Si la subida es solo local, resolvemos aquí
                    console.log('Archivo guardado localmente y base de datos actualizada.');
                    resolve();

                } catch (uploadError) {
                    console.error('Error al procesar archivo:', uploadError.message);
                    reject(new Error('Error al procesar archivo.'));
                }
                // No hay bloque finally para eliminar el archivo, ya que se mantiene localmente.
            }
        });
    });
};


// --- ESTRATEGIA LOCAL PARA INICIO DE SESIÓN DE USUARIOS (local.signin) ---
passport.use(
    'local.signin', // Nombre de la estrategia para usuarios (ej. administradores, operadores)
    new LocalStrategy(
        {
            usernameField: 'correo_electronico', // Campo que usará como "username" para la autenticación
            passwordField: 'contrasena', // Campo que usará como "password"
            passReqToCallback: true, // Permite acceder al objeto 'req' dentro del callback
        },
        async (req, correo_electronico, contrasena, done) => { // Callback de autenticación
            try {
                // Descifrar todos los correos de usuarios para buscar (evita problemas con cifrado no determinístico)
                const [usuariosSQL] = await sql.promise().query("SELECT * FROM usuarios WHERE estado = 'activo'");
                const usuario = usuariosSQL.find(u => descifrarDato(u.correo_electronico) === correo_electronico);

                if (!usuario) {
                    // Si no se encuentra el usuario, falla la autenticación
                    return done(null, false, req.flash('message', 'El correo electrónico no existe.'));
                }

                // Compara la contraseña proporcionada con la contraseña almacenada directamente
                // ADVERTENCIA: Almacenar contraseñas sin hash es una práctica insegura.
                // Se hace por solicitud específica, pero se recomienda usar bcrypt o similar.
                if (contrasena !== usuario.contrasena_hash) {
                    // Si las contraseñas no coinciden, falla la autenticación
                    return done(null, false, req.flash('message', 'Contraseña incorrecta.'));
                }

                // Descifrar el nombre del usuario para un mensaje de bienvenida (si se usa req.flash)
                const nombreDescifrado = descifrarDato(usuario.nombre); 
                // Autentica al usuario. Se adjunta 'type: usuario'.
                return done(null, { id: usuario.id, type: 'usuario' }, req.flash('success', `Bienvenido ${nombreDescifrado}`)); 
            } catch (error) {
                console.error('Error en local.signin (Usuario):', error); // Log de errores internos
                return done(error); // Pasa el error a Passport
            }
        }
    )
);

// --- ESTRATEGIA LOCAL PARA REGISTRO DE USUARIOS (local.signup) ---
passport.use(
    'local.signup', // Nombre de la estrategia para registro de usuarios
    new LocalStrategy(
        {
            usernameField: 'correo_electronico',
            passwordField: 'contrasena',
            passReqToCallback: true,
        },
        async (req, correo_electronico, contrasena, done) => { // Callback de registro llamar al listado del orm llamar listado del orm
            try {
                // Cifra el correo electrónico de entrada para verificar si ya existe (asumiendo cifrado determinístico)
                const correo_electronico_cifrado = cifrarDato(correo_electronico);
                // Usando orm.usuario directamente
                const existingUsuario = await orm.usuario.findOne({ where: { correo_electronico: correo_electronico_cifrado } }); 
                if (existingUsuario) {
                    return done(null, false, req.flash('message', 'El correo electrónico ya está registrado.'));
                }

                // La contraseña se guarda directamente sin hash
                // ADVERTENCIA: Almacenar contraseñas sin hash es una práctica insegura.
                // Se hace por solicitud específica, pero se recomienda usar bcrypt o similar.
                const passwordToStore = contrasena; 
                const { nombre, cedula_identidad, fecha_nacimiento, direccion } = req.body; 

                // Crear el nuevo usuario en la base de datos SQL (sin la foto inicialmente)
                // Usando orm.usuario directamente
                const nuevoUsuarioSQL = await orm.usuario.create({
                    nombre: cifrarDato(nombre), 
                    correo_electronico: correo_electronico_cifrado, 
                    cedula_identidad: cifrarDato(cedula_identidad), 
                    contrasena_hash: passwordToStore, // Se guarda la contraseña sin hash
                    estado: 'activo', 
                    // photoUser: null // Inicialmente nulo, se actualiza después de la subida
                });

                // Crear documento en MongoDB para el usuario
                const nuevoUsuarioMongo = { 
                    idUsuarioSql: nuevoUsuarioSQL.id, 
                    fecha_nacimiento, 
                    direccion: cifrarDato(direccion), // Cifrar dirección en Mongo
                    estado: 'activo' 
                };
                await mongo.Usuario.create(nuevoUsuarioMongo);

                // --- Lógica de subida de foto de perfil para USUARIOS ---
                if (req.files && req.files.photoUser) { // Asume que el campo de archivo se llama 'photoUser'
                    const { photoUser } = req.files;
                    const photoFilePath = path.join(__dirname, '/../public/img/usuarios/', photoUser.name); // Ruta para guardar la foto
                    // La URL de subida externa ha sido eliminada, ya que la gestión es local.

                    try {
                        // Usando orm.usuario directamente
                        // Se pasa 'null' como uploadUrl ya que la subida externa no se realiza
                        await guardarYSubirArchivo(photoUser, photoFilePath, 'photoUser', nuevoUsuarioSQL.id, null, req, orm.usuario);
                        console.log(`[REGISTRO USUARIO] Foto de perfil guardada localmente y DB actualizada para usuario ID: ${nuevoUsuarioSQL.id}`);
                    } catch (uploadError) {
                        console.error(`[REGISTRO USUARIO] Error al procesar foto de perfil para usuario ID ${nuevoUsuarioSQL.id}:`, uploadError.message);
                        // Puedes decidir si el registro falla por esto o solo lo logueas
                        // return done(uploadError); // Si quieres que el registro falle por un error de foto
                    }
                }

                // Autentica al nuevo usuario después del registro. Se adjunta 'type: usuario'.
                return done(null, { id: nuevoUsuarioSQL.id, type: 'usuario' }); 
            } catch (error) {
                console.error('Error en local.signup (Usuario):', error); 
                return done(error);
            }
        }
    )
);

// --- ESTRATEGIA LOCAL PARA INICIO DE SESIÓN DE CLIENTES (local.clientSignin) ---
passport.use(
    'local.clientSignin', // Nombre de la nueva estrategia para clientes
    new LocalStrategy(
        {
            usernameField: 'correo_electronico', // Campo que usará como "username" para clientes
            passwordField: 'contrasena', // Campo que usará como "password" para clientes
            passReqToCallback: true, 
        },
        async (req, correo_electronico, contrasena, done) => { // Callback de autenticación de clientes
            try {
                // Descifrar todos los correos de clientes para buscar
                const [clientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE estado = 'activo'");
                const cliente = clientesSQL.find(c => descifrarDato(c.correo_electronico) === correo_electronico);

                if (!cliente) {
                    return done(null, false, req.flash('message', 'El correo electrónico no existe para clientes.'));
                }

                // Compara la contraseña proporcionada con la contraseña almacenada directamente
                // ADVERTENCIA: Almacenar contraseñas sin hash es una práctica insegura.
                // Se hace por solicitud específica, pero se recomienda usar bcrypt o similar.
                if (contrasena !== cliente.contrasena_hash) {
                    return done(null, false, req.flash('message', 'Contraseña incorrecta para clientes.'));
                }

                const nombreDescifrado = descifrarDato(cliente.nombre);
                // Autentica al cliente. Se adjunta 'type: cliente'.
                return done(null, { id: cliente.id, type: 'cliente' }, req.flash('success', `Bienvenido Cliente ${nombreDescifrado}`)); 
            } catch (error) {
                console.error('Error en local.clientSignin (Cliente):', error); 
                return done(error);
            }
        }
    )
);

// --- ESTRATEGIA LOCAL PARA REGISTRO DE CLIENTES (local.clientSignup) ---
passport.use(
    'local.clientSignup', // Nombre de la nueva estrategia para clientes
    new LocalStrategy(
        {
            usernameField: 'correo_electronico',
            passwordField: 'contrasena',
            passReqToCallback: true,
        },
        async (req, correo_electronico, contrasena, done) => { // Callback de registro de clientes
            try {
                const correo_electronico_cifrado = cifrarDato(correo_electronico);
                // Usando orm.cliente directamente
                const existingCliente = await orm.cliente.findOne({ where: { correo_electronico: correo_electronico_cifrado } }); 
                if (existingCliente) {
                    return done(null, false, req.flash('message', 'El correo electrónico ya está registrado para clientes.'));
                }

                // La contraseña se guarda directamente sin hash
                // ADVERTENCIA: Almacenar contraseñas sin hash es una práctica insegura.
                // Se hace por solicitud específica, pero se recomienda usar bcrypt o similar.
                const passwordToStore = contrasena; 
                const { nombre, cedula_identidad, fecha_nacimiento, direccion } = req.body; 

                // Crear cliente en la base de datos SQL (sin la foto inicialmente)
                // Usando orm.cliente directamente
                const nuevoClienteSQL = await orm.cliente.create({
                    nombre: cifrarDato(nombre),
                    correo_electronico: correo_electronico_cifrado,
                    cedula_identidad: cifrarDato(cedula_identidad),
                    contrasena_hash: passwordToStore, // Se guarda la contraseña sin hash
                    numero_ayudas: 0, // Valor por defecto para clientes
                    estado: 'activo'
                    // photoClient: null // Inicialmente nulo, se actualiza después de la subida
                });

                // Crear documento en la base de datos MongoDB para el cliente
                const nuevoClienteMongo = { 
                    idClienteSql: nuevoClienteSQL.id, 
                    fecha_nacimiento, 
                    direccion: cifrarDato(direccion), // Cifrar dirección en Mongo
                    estado: 'activo' 
                };
                await mongo.Cliente.create(nuevoClienteMongo);

                // --- Lógica de subida de foto de perfil para CLIENTES ---
                if (req.files && req.files.photoClient) { // Asume que el campo de archivo se llama 'photoClient'
                    const { photoClient } = req.files;
                    const photoFilePath = path.join(__dirname, '/../public/img/clientes/', photoClient.name); // Ruta para guardar la foto
                    // La URL de subida externa ha sido eliminada, ya que la gestión es local.

                    try {
                        // Usando orm.cliente directamente
                        // Se pasa 'null' como uploadUrl ya que la subida externa no se realiza
                        await guardarYSubirArchivo(photoClient, photoFilePath, 'photoClient', nuevoClienteSQL.id, null, req, orm.cliente);
                        console.log(`[REGISTRO CLIENTE] Foto de perfil guardada localmente y DB actualizada para cliente ID: ${nuevoClienteSQL.id}`);
                    } catch (uploadError) {
                        console.error(`[REGISTRO CLIENTE] Error al procesar foto de perfil para cliente ID ${nuevoClienteSQL.id}:`, uploadError.message);
                        // Puedes decidir si el registro falla por esto o solo lo logueas
                        // return done(uploadError); // Si quieres que el registro falle por un error de foto
                    }
                }

                // Autentica al nuevo cliente después del registro. Se adjunta 'type: cliente'.
                return done(null, { id: nuevoClienteSQL.id, type: 'cliente' }); 
            } catch (error) {
                console.error('Error en local.clientSignup (Cliente):', error); 
                return done(error);
            }
        }
    )
);
// --- SERIALIZACIÓN Y DESERIALIZACIÓN DE USUARIOS ---
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Exporta la configuración de passport para usarla en tu app principal
module.exports = passport;
