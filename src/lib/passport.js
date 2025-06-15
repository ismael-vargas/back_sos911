const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const db = require('../Database/dataBase.orm'); // Ajusta la ruta a tu archivo ORM

const Usuario = db.usuario; // Asegúrate de que 'usuario' se esté importando correctamente
console.log(Usuario);
passport.use(
    'local.signin',
    new LocalStrategy(
        {
            usernameField: 'correo_electronico',
            passwordField: 'contrasena',
            passReqToCallback: true,
        },
        async (req, correo_electronico, contrasena, done) => {
            try {
                const usuario = await Usuario.findOne({ where: { correo_electronico } });
                if (!usuario) {
                    return done(null, false, req.flash('message', 'El correo electrónico no existe.'));
                }

                const validPassword = await bcrypt.compare(contrasena, usuario.contrasena_hash);
                if (!validPassword) {
                    return done(null, false, req.flash('message', 'Contraseña incorrecta.'));
                }

                return done(null, usuario, req.flash('success', `Bienvenido ${usuario.nombre}`));
            } catch (error) {
                return done(error);
            }
        }
    )
);

passport.use(
    'local.signup',
    new LocalStrategy(
        {
            usernameField: 'correo_electronico',
            passwordField: 'contrasena',
            passReqToCallback: true,
        },
        async (req, correo_electronico, contrasena, done) => {
            try {
                const existingUsuario = await Usuario.findOne({ where: { correo_electronico } });
                if (existingUsuario) {
                    return done(null, false, req.flash('message', 'El correo electrónico ya está registrado.'));
                }

                const hashedPassword = await bcrypt.hash(contrasena, 10);
                const { nombre, cedula_identidad, direccion } = req.body;

                const nuevoUsuario = await Usuario.create({
                    nombre,
                    correo_electronico,
                    cedula_identidad,
                    direccion,
                    contrasena_hash: hashedPassword,
                    estado: 'activo',
                });

                return done(null, nuevoUsuario);
            } catch (error) {
                return done(error);
            }
        }
    )
);

passport.serializeUser((usuario, done) => {
    done(null, usuario.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const usuario = await Usuario.findByPk(id);
        done(null, usuario);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;
