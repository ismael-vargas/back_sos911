// Importar módulos necesarios
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const fileUpload = require("express-fileupload");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const winston = require('winston');
const fs = require('fs');
const crypto = require('crypto');
const hpp = require('hpp');
const toobusy = require('toobusy-js');
const cors = require('cors');
const { minify } = require('html-minifier-terser');

// Importar módulos locales
const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT } = require('./keys');
require('./lib/passport');

// Crear aplicación Express
const app = express();

// ==================== CONFIGURACIÓN BÁSICA ====================
app.set('port', process.env.PORT || 1000); // Usar tu puerto 9000 como predeterminado

// ==================== CONFIGURACIÓN CORREGIDA ====================

// 1. Configuración CORS mejorada (agregar headers CSRF)
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.1.31:3000',
  'http://192.168.1.31:1000',
  'http://31.97.42.126:1000',
  'https://backsos911-production.up.railway.app',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'xsrf-token', 'x-csrf-token']
}));

// ==================== CONFIGURACIÓN DE LOGS ====================

// Asegura que la carpeta "logs" exista
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// CONFIGURACIÓN DE LOGGING (ÚNICA Y MEJORADA)
const logger = winston.createLogger({
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  },
  level: 'debug', // Nivel por defecto para el logger
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Mantiene el formato de hora local para los logs de Winston
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(info => {
      // Si el mensaje ya viene con el formato de Morgan, no lo alteres
      if (info.message.startsWith('[') && info.message.includes('] [INFO]: [') && info.message.includes('Agent:')) {
        return info.message;
      }
      // Para logs de negocio, usa el formato con dos puntos después de [INFO]:
      return `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}${info.stack ? '\nSTACK:\n' + info.stack : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'), // <-- Aquí se define 'combined.log'
      level: 'http', // Nivel para el archivo
      maxsize: 5242880 * 5, // 25MB
      maxFiles: 3,
      tailable: true
    }),
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })]
      : [])
  ]
});

// Redefinir console.log y console.error para que usen winston
console.log = (...args) => logger.info(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
console.debug = (...args) => logger.debug(args.join(' '));

// 3. Configurar Morgan para usar Winston
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
    stream: {
        write: (message) => {
            // Eliminar saltos de línea innecesarios
            const cleanedMessage = message.replace(/\n$/, '');
            logger.info(cleanedMessage);
        }
    }
}));

// Añadir el logger a la app para acceso global en controladores
app.set('logger', logger);

// ==================== CONFIGURACIÓN DE SEGURIDAD MEJORADA ====================

// 4. Middleware de protección contra sobrecarga del servidor
app.use((req, res, next) => {
    if (toobusy()) {
        logger.warn('Server too busy!');
        res.status(503).json({ error: 'Server too busy. Please try again later.' });
    } else {
        next();
    }
});

// 5. Configuración de Helmet
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
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
}));

// 6. Protección contra HTTP Parameter Pollution
app.use(hpp());

// 9. Configuración avanzada de cookies
app.use(cookieParser(
    process.env.COOKIE_SECRET || crypto.randomBytes(64).toString('hex')
));

// 5. Configuración de seguridad para cookies (agregar en sessionConfig)
const isProduction = process.env.NODE_ENV === 'production';
const sessionConfig = {
  store: new MySQLStore({
    host: MYSQLHOST,
    port: MYSQLPORT,
    user: MYSQLUSER,
    password: MYSQLPASSWORD,
    database: MYSQLDATABASE,
    createDatabaseTable: true
  }),
  genid: function(req) {
    return crypto.randomBytes(16).toString('hex'); // Generar ID de sesión seguro
  },
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: 24 * 60 * 60 * 1000
  },
  name: 'secureSessionId',
  rolling: true,
  unset: 'destroy'
};
if (isProduction) {
  app.set('trust proxy', 1);
}

// 2. Middleware de sesión debe ir ANTES de CSRF
app.use(session(sessionConfig));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// 6. Middleware para asegurar inicialización de sesión
app.use((req, res, next) => {
  if (!req.session) {
    req.session = {};
  }
  if (!req.session.secret) {
    req.session.secret = crypto.randomBytes(32).toString('hex');
  }
  next();
});


// 7. Limitar tamaño de payload (MOVIDO AQUÍ, ANTES DE fileUpload y CSRF)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Configurar middleware de subida de archivos (MOVIDO AQUÍ, ANTES DE CSRF)
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true,
    safeFileNames: true,
    preserveExtension: true
}));

// 3. Inicializar CSRF protection ANTES de la ruta /csrf-token
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax'
  }
});
app.use(csrfProtection); // Aplicar globalmente

// 4. Ahora sí la ruta /csrf-token tendrá acceso a req.csrfToken()
app.get('/csrf-token', (req, res) => {
  try {
    // Verificar que la sesión esté inicializada
    if (!req.session) {
      logger.error('Sesión no inicializada');
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    const csrfToken = req.csrfToken();
    res.json({ csrfToken });
    logger.info('Token CSRF generado exitosamente');
  } catch (error) {
    logger.error('Error generando CSRF token:', error);
    res.status(500).json({ 
      error: 'Error generando token de seguridad',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});


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


// Middleware de compresión
app.use(compression());


// 8. Rate limiting para prevenir ataques de fuerza bruta (MOVIDO AQUÍ, DESPUÉS DE CSRF)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip} (Global Limiter)`);
        res.status(429).json({
            error: 'Too many requests, please try again later.'
        });
    }
});
app.use(globalLimiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Demasiados intentos de inicio de sesión desde esta IP, por favor intente nuevamente después de 15 minutos.'
});
app.use('/login', loginLimiter);


// ==================== RUTAS API ====================
app.use(require('./router/index.router'));
app.use(require('./router/envio.router'));
app.use('/pagina', require('./router/pagina.router'));
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
app.use('/servicios_emergencia', require('./router/servicios_emergencia.router'));
app.use('/contenido_app', require('./router/contenido_app.router'));


// ==================== MANEJO DE ERRORES ====================

// Middleware de manejo de errores mejorado para API
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    logger.error(`Error: ${err.message}\nStack: ${err.stack}`);

    // Respuestas de error estandarizadas
    if (err.name === 'ValidationError') {
        return res.apiError('Validation error', 400, err.errors);
    }

    if (err.code === 'EBADCSRFTOKEN') {
        return res.apiError('CSRF token validation failed', 403);
    }

    // Error no manejado
    const errorResponse = {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };

    res.status(500).json(errorResponse);
});

// Middleware para rutas no encontradas (API)
app.use((req, res, next) => {
    logger.warn(`404 Not Found: ${req.originalUrl}`);
    res.apiError('Endpoint not found', 404);
});

// Exportar la aplicación
module.exports = app;
