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
const cors = require('cors');
const logger = require('./logs/logger'); // ✅ IMPORTA tu logger centralizado



const { Loader } = require('@googlemaps/js-api-loader')

// Importar módulos locales
const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT } = require('./keys');
require('./lib/passport');

// Crear aplicación Express
const app = express();

// Configurar CORS
app.use(cors({
  origin: 'http://localhost:3000',
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
    secret: "SESSION_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'Strict'
    }
}));

// Configurar motor de vistas
app.set('port', process.env.PORT || 9000);

// Configurar middleware
app.use(cookieParser());
app.use(fileUpload({ createParentPath: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Middleware de seguridad y rendimiento
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(compression());

// Middleware para minificar HTML
app.use(async (req, res, next) => {
    const originalSend = res.send.bind(res);
    res.send = async function (body) {
        if (typeof body === 'string') {
            try {
                body = await minify(body, {
                    removeComments: true,
                    collapseWhitespace: true,
                    minifyCSS: true,
                    minifyJS: true,
                });
            } catch (err) {
                console.error('Error minifying HTML:', err);
            }
        }
        return originalSend(body);
    };
    next();
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Limitar a 5 intentos de inicio de sesión por ventana por IP
    message: 'Demasiados intentos de inicio de sesión desde esta IP, por favor intente nuevamente después de 15 minutos.'
});
app.use('/rutaLogin', loginLimiter);

// Ruta de prueba de errores (DEBE ESTAR ANTES del middleware de errores)
app.get('/error-prueba', (req, res) => {
  throw new Error('Este es un error de prueba para verificar el log.');
});


// Middleware de manejo de errores

app.use((err, req, res, next) => {
    console.log('⚠️ ENTRÓ AL MIDDLEWARE DE ERRORES'); // 👈 Esto confirmará si pasa por aquí

    if (res.headersSent) return next(err);

    // 💥 Registrar el error correctamente
    logger.error(err.message, { stack: err.stack });

    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: 'Datos inválidos.' });
    }

    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).send('La validación del token CSRF ha fallado. Por favor, recarga la página.');
    }

    // 🔥 Respuesta genérica para otros errores
    return res.status(500).send('Error interno del servidor');
});


// Configurar variables globales
app.use((req, res, next) => {
    app.locals.message = req.flash('message');
    app.locals.success = req.flash('success');
    app.locals.user = req.user || null;
    next();
});

// Ruta para obtener el token CSRF desde el frontend
app.get('/csrf-token', csrf({ cookie: true }), (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});


// Middleware de protección CSRF
const csrfMiddleware = csrf({ cookie: true });
app.use(csrfMiddleware);


app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});


// Configurar archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src/public', express.static(path.join(__dirname, 'src/public')));



app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rutas - Definir tus rutas aquí
app.use(require('./router/index.router'));
app.use(require('./router/envio.router'));
app.use(require('./router/usuarios.router'));
app.use(require('./router/contactos_clientes.router'));
app.use(require('./router/clientes.router'));
app.use(require('./router/clientes_numeros.router'));
app.use(require('./router/clientes_grupos.router'));
app.use(require('./router/usuarios_roles.router'))
app.use(require('./router/usuarios_numeros.router'))
app.use(require('./router/roles.router'))
app.use(require('./router/ubicaciones_clientes.router'))
app.use(require('./router/contactos_emergencias.router'));
app.use(require('./router/dispositivos.router'));
app.use(require('./router/evaluaciones_situaciones.router'));
app.use(require('./router/notificaciones.router'));
app.use(require('./router/grupos.router'));
app.use(require('./router/informes_estadisticas.router'));
app.use(require('./router/presion_boton_panico.router'));


// Exportar la aplicación
module.exports = app;
