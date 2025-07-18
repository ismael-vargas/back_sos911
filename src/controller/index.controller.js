const passport = require('passport');
const orm = require('../Database/dataBase.orm'); // Importación del ORM (Sequelize)
const sql = require('../Database/dataBase.sql'); // Importación de la conexión SQL directa
const FormData = require('form-data'); // Para manejar datos de formulario multipart/form-data
const fs = require('fs'); // Para operaciones de sistema de archivos
const path = require('path'); // Para trabajar con rutas de archivos
const axios = require('axios'); // Para hacer solicitudes HTTP a APIs externas
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Utilidades de cifrado/descifrado
const { validationResult } = require('express-validator'); // Para manejo de resultados de validación

const indexCtl = {};

// --- Utilidad para Descifrado Seguro (para campos que se descifran en la respuesta) ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos:', error.message);
        return '';
    }
}

// Utilidad para obtener el logger (para consistencia)
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// Generar y enviar el token CSRF
indexCtl.mostrar = async (req, res) => {
    const logger = getLogger(req); // Usar logger
    logger.info('[INDEX] Solicitud de token CSRF.');
    try {
        res.json({ csrfToken: req.csrfToken() });
    } catch (error) {
        logger.error(`[INDEX] Error al generar token CSRF: ${error.message}`); // Usar logger
        res.status(500).json({ error: 'Error interno del servidor al generar token CSRF.' }); // Devolver JSON
    }
};

// Mostrar formulario de registro si no hay usuarios, o redirigir si ya existen
indexCtl.mostrarRegistro = async (req, res) => {
    const logger = getLogger(req); // Usar logger
    logger.info('[INDEX] Solicitud de estado de registro de usuarios.');
    try {
        const [usuario] = await sql.promise().query('SELECT COUNT(*) AS total FROM usuarios');
        if (usuario[0].total === 0) {
            const [rows] = await sql.promise().query('SELECT MAX(id) AS Maximo FROM usuarios');
            logger.info(`[INDEX] No hay usuarios registrados. Max ID: ${rows[0].Maximo || 0}.`); // Usar logger
            res.json({ maxUserId: rows[0].Maximo || 0, csrfToken: req.csrfToken() });
        } else {
            logger.info('[INDEX] Usuarios ya registrados, denegando registro público.'); // Usar logger
            res.json({ redirect: '/', message: 'El registro público no está disponible.' }); // Devolver JSON consistente
        }
    } catch (error) {
        logger.error(`[INDEX] Error al verificar usuarios para registro: ${error.message}`); // Usar logger
        res.status(500).json({ error: 'Error interno del servidor al verificar usuarios.' }); // Devolver JSON
    }
};

// Registro de usuarios
indexCtl.registro = (req, res, next) => {
    const logger = getLogger(req); // Usar logger
    logger.info(`[INDEX] Intento de registro de usuario.`);
    passport.authenticate('local.signup', (err, usuario, info) => {
        if (err) {
            logger.error(`[INDEX] Error en la autenticación de registro: ${err.message}`); // Usar logger
            return res.status(500).json({ error: 'Error en el servidor durante el registro.' }); // Devolver JSON
        }
        if (!usuario) {
            logger.warn(`[INDEX] Registro fallido: ${info ? info.message : 'Credenciales inválidas.'}`); // Usar logger
            return res.status(400).json({ message: info ? info.message : 'Correo ya registrado o datos inválidos.' });
        }
        req.logIn(usuario, (err) => {
            if (err) {
                logger.error(`[INDEX] Error al iniciar sesión después del registro: ${err.message}`); // Usar logger
                return res.status(500).json({ error: 'Error al iniciar sesión después del registro.' }); // Devolver JSON
            }
            logger.info(`[INDEX] Registro exitoso para usuario ID: ${usuario.id}.`); // Usar logger
            // Devolver JSON para API
            res.json({ message: 'Registro exitoso', userId: usuario.id, redirect: '/' });
        });
    })(req, res, next);
};

// Inicio de sesión de usuarios
indexCtl.login = (req, res, next) => {
    const logger = getLogger(req); // Usar logger
    logger.info(`[INDEX] Intento de inicio de sesión.`);
    passport.authenticate('local.signin', (err, usuario, info) => {
        if (err) {
            logger.error(`[INDEX] Error en la autenticación de login: ${err.message}`); // Usar logger
            return res.status(500).json({ error: 'Error en el servidor durante el inicio de sesión.' }); // Devolver JSON
        }
        if (!usuario) {
            logger.warn(`[INDEX] Login fallido: ${info ? info.message : 'Credenciales incorrectas.'}`); // Usar logger
            return res.status(401).json({ message: info ? info.message : 'Credenciales incorrectas.' });
        }
        req.logIn(usuario, (err) => {
            if (err) {
                logger.error(`[INDEX] Error al iniciar sesión: ${err.message}`); // Usar logger
                return res.status(500).json({ error: 'Error al iniciar sesión.' }); // Devolver JSON
            }
            logger.info(`[INDEX] Inicio de sesión exitoso para usuario ID: ${usuario.id}.`); // Usar logger
            // Devolver JSON para API
            res.json({ message: 'Inicio de sesión exitoso', userId: usuario.id, redirect: '/dashboard' });
        });
    })(req, res, next);
};

// Cerrar sesión
indexCtl.CerrarSesion = (req, res, next) => {
    const logger = getLogger(req); // Usar logger
    logger.info('[INDEX] Solicitud de cierre de sesión.');
    req.logout((err) => {
        if (err) {
            logger.error(`[INDEX] Error al cerrar sesión: ${err.message}`); // Usar logger
            return res.status(500).json({ error: 'Error al cerrar sesión.' }); // Devolver JSON
        }
        logger.info('[INDEX] Sesión cerrada con éxito.'); // Usar logger
        // Devolver JSON para API
        res.json({ message: 'Sesión cerrada con éxito', redirect: '/' });
    });
};

module.exports = indexCtl;
