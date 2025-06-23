// Importar módulos necesarios
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const bodyparser = require('body-parser');
const fileUpload = require("express-fileupload");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { minify } = require('html-minifier-terser');
const winston = require('winston');
const fs = require('fs');
const cors = require('cors');
const { Loader } = require('@googlemaps/js-api-loader')

// Importar módulos locales
const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT } = require('./keys');
require('./lib/passport');

// Base de datos MongoDB
const connectMongoDB = require('./Database/dataBase.mongo');
connectMongoDB(); // Conectar a MongoDB Atlas

// Crear aplicación Express
const app = express();

// Configurar CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.1.31'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'csrf-token']
}));

// Configurar helmet y Content Security Policy
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"],
            "img-src": ["'self'", "data:", "blob:", "https://maps.gstatic.com", "https://*.googleapis.com"],
            "frame-src": ["'self'", "blob:", "https://www.google.com"],
            "connect-src": ["'self'", "https://maps.googleapis.com"],
            "object-src": ["'none'"],
            "default-src": ["'self'"]
        }
    },
}));

// Configurar almacenamiento de sesiones MySQL
const mysqlOptions = {
    host: MYSQLHOST,
    port: MYSQLPORT,
    user: MYSQLUSER,
    password: MYSQLPASSWORD,
    database: MYSQLDATABASE,
    createDatabaseTable: true
};
const sessionStore = new MySQLStore(mysqlOptions);

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "SESSION_SECRET", // ✅ Usa variable de entorno si existe
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'Strict'
    }
}));

app.set('port', process.env.PORT || 9000);

// Middleware para parsear cookies (debe ir antes de CSRF y sesiones)
app.use(cookieParser());

// Middleware para subir archivos
app.use(fileUpload({ createParentPath: true }));

// Logger de peticiones HTTP
app.use(morgan('dev'));

// Parseo de JSON y URL-encoded
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ extended: true }));

// Flash messages para sesiones
app.use(flash());

// Inicializar passport y sesiones
app.use(passport.initialize());
app.use(passport.session());

// Seguridad extra y compresión
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(compression());

// Middleware para minificar HTML SOLO si el tipo de respuesta es HTML
app.use(async (req, res, next) => {
    const originalSend = res.send.bind(res);
    res.send = async function (body) {
        if (typeof body === 'string' && res.get('Content-Type') && res.get('Content-Type').includes('text/html')) {
            try {
                body = await minify(body, {
                    removeComments: true,
                    collapseWhitespace: true,
                    minifyCSS: true,
                    minifyJS: true,
                });
            } catch (err) {
                logger.error('Error minificando HTML', { stack: err.stack });
            }
        }
        return originalSend(body);
    };
    next();
});

// Rate limiter SOLO para rutas de login reales
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Demasiados intentos de inicio de sesión desde esta IP, por favor intente nuevamente después de 15 minutos.'
});
app.use('/login', loginLimiter); // ✅ Aplica solo a la ruta real de login

// Ruta de prueba de errores (para verificar logs)
app.get('/error-prueba', (req, res) => {
  throw new Error('Este es un error de prueba para verificar el log.');
});

// Middleware de protección CSRF (debe ir después de cookieParser y sesión)
const csrfMiddleware = csrf({ cookie: true });
app.use(csrfMiddleware);

// Ruta para obtener el token CSRF desde el frontend
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Middleware para exponer el token CSRF en res.locals
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Configurar archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src/public', express.static(path.join(__dirname, 'src/public')));

// Logger para todas las peticiones HTTP en combined.log
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rutas principales de la aplicación
app.use(require('./router/index.router'));
app.use(require('./router/envio.router'));
app.use('/usuarios', require('./router/usuarios.router'));
app.use('/contactos_clientes', require('./router/contactos_clientes.router'));
app.use('/contactos_emergencias', require('./router/contactos_emergencias.router'));
app.use('/dispositivos', require('./router/dispositivos.router'));
app.use('/evaluaciones_situaciones', require('./router/evaluaciones_situaciones.router'));
app.use('/grupos', require('./router/grupos.router'));
app.use('/informes_estadisticas', require('./router/informes_estadisticas.router'));
app.use('/mensajes_grupo', require('./router/mensajes_grupo.router'));
app.use('/notificaciones', require('./router/notificaciones.router'));
app.use('/presion_boton_panico', require('./router/presion_boton_panico.router'));
app.use('/roles', require('./router/roles.router'));
app.use('/ubicaciones_clientes', require('./router/ubicaciones_clientes.router'));
app.use('/usuarios_numeros', require('./router/usuarios_numeros.router'));
app.use('/usuarios_roles', require('./router/usuarios_roles.router'));
app.use('/clientes', require('./router/clientes.router'));
app.use('/clientes_numeros', require('./router/clientes_numeros.router'));
app.use('/clientes_grupos', require('./router/clientes_grupos.router'));

// Variables globales para vistas (si usas plantillas)
app.use((req, res, next) => {
    app.locals.message = req.flash('message');
    app.locals.success = req.flash('success');
    app.locals.user = req.user || null;
    next();
});

// Middleware de manejo de errores 
app.use((err, req, res, next) => {
    // Si ya se enviaron los headers, pasa al siguiente manejador
    if (res.headersSent) return next(err);

    // Registrar el error en el logger
    logger.error(err.message, { stack: err.stack });

    // Ejemplo de registro de errores reales:
    if (err.name === 'ValidationError') {
        logger.warn('Error de validación de datos recibido');
        return res.status(400).json({ error: 'Datos inválidos.' });
    }

    if (err.code === 'EBADCSRFTOKEN') {
        logger.warn('Error de validación CSRF');
        return res.status(403).send('La validación del token CSRF ha fallado. Por favor, recarga la página.');
    }

    // Ejemplo de error personalizado: ruta no encontrada
    if (err.status === 404) {
        logger.warn(`Ruta no encontrada: ${req.originalUrl}`);
        return res.status(404).send('Ruta no encontrada');
    }

    // Respuesta genérica para otros errores
    logger.error('Error interno del servidor');
    return res.status(500).send('Error interno del servidor');
});

module.exports = app;

// Asegura que la carpeta "logs" exista
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuración de Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${stack ? '\nSTACK:\n' + stack : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'warn' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') })
  ]
});

// En desarrollo, también muestra los logs en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
