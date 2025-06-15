const passport = require('passport');
const sql = require('../Database/dataBase.sql');

const indexCtl = {};

// Generar y enviar el token CSRF
indexCtl.mostrar = async (req, res) => {
    try {
        res.json({ csrfToken: req.csrfToken() });
    } catch (error) {
        console.error('Error en la consulta SQL:', error.message);
        res.status(500).send('Error interno del servidor');
    }
};

// Mostrar formulario de registro si no hay usuarios, o redirigir si ya existen
indexCtl.mostrarRegistro = async (req, res) => {
    try {
        const [usuario] = await sql.promise().query('SELECT COUNT(*) AS total FROM usuarios');
        if (usuario[0].total === 0) {
            const [rows] = await sql.promise().query('SELECT MAX(id) AS Maximo FROM usuarios');
            res.json({ maxUserId: rows[0].Maximo, csrfToken: req.csrfToken() });
        } else {
            res.json({ redirect: '/' });
        }
    } catch (error) {
        console.error('Error en la consulta SQL:', error.message);
        res.status(500).send('Error al realizar la consulta');
    }
};

// Registro de usuarios
indexCtl.registro = (req, res, next) => {
    passport.authenticate('local.signup', (err, usuario, info) => {
        if (err) {
            console.error('Error en el registro:', err);
            return next(err);
        }
        if (!usuario) {
            return res.status(400).json({ message: info ? info.message : 'Correo ya registrado' });
        }
        req.logIn(usuario, (err) => {
            if (err) {
                console.error('Error al iniciar sesión después del registro:', err);
                return next(err);
            }
            return res.json({ message: 'Registro exitoso', redirect: '/' });
        });
    })(req, res, next);
};

// Inicio de sesión de usuarios
indexCtl.login = (req, res, next) => {
    passport.authenticate('local.signin', (err, usuario, info) => {
        if (err) {
            return next(err);
        }
        if (!usuario) {
            return res.status(400).json({ message: info ? info.message : 'Credenciales incorrectas' });
        }
        req.logIn(usuario, (err) => {
            if (err) {
                return next(err);
            }
            return res.json({ message: 'Inicio de sesión exitoso', redirect: '/dashboard'});
        });
    })(req, res, next);
};

// Cerrar sesión
indexCtl.CerrarSesion = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.json({ message: 'Sesión cerrada con éxito', redirect: '/' });
    });
};

module.exports = indexCtl;
