const { usuario } = require('../Database/dataBase.orm'); // Modelo relacional
const Preferencias = require('../models/preferencias.model'); // Modelo no relacional
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js'); // <-- Para hash SHA256

function hashCorreo(correo) {
    return CryptoJS.SHA256(correo).toString(CryptoJS.enc.Hex);
}

// Controlador de usuarios
const usersCtl = {};

// Utilidad para obtener el logger desde req.app
function getLogger(req) {
    return req.app.get('logger');
}

// Crear un nuevo usuario
usersCtl.crearUsuario = async (req, res, next) => {
    const logger = getLogger(req);
    let { nombre, correo_electronico, cedula_identidad, direccion, estado, contrasena } = req.body;
    logger.info(`[USUARIO] Intento de registro: correo=${correo_electronico}, nombre=${nombre}`);
    try {
        // Cifrar los campos sensibles
        const nombreCif = cifrarDato(nombre);
        const correoCif = cifrarDato(correo_electronico);
        const correoHash = hashCorreo(correo_electronico); // <-- Hash para búsqueda
        const cedulaCif = cifrarDato(cedula_identidad);
        const direccionCif = cifrarDato(direccion);

        // Verificar si el usuario ya existe (busca por hash)
        const existingUser = await usuario.findOne({ where: { correo_hash: correoHash } });
        if (existingUser) {
            logger.warn(`[USUARIO] Registro fallido: correo ya registrado (${correo_electronico})`);
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // Validar que el estado es un valor ENUM válido
        const validStates = ['activo', 'eliminado'];
        if (!validStates.includes(estado)) {
            logger.warn(`[USUARIO] Registro fallido: estado inválido (${estado})`);
            return res.status(400).json({ message: 'El estado debe ser uno de los siguientes valores: activo, eliminado.' });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        // Crear un nuevo usuario
        const newUser = await usuario.create({
            nombre: nombreCif,
            correo_electronico: correoCif,
            correo_hash: correoHash, // <-- Guarda el hash
            cedula_identidad: cedulaCif,
            direccion: direccionCif,
            estado, // No se cifra
            contrasena_hash: hashedPassword
        });
        logger.info(`[USUARIO] Registro exitoso: id=${newUser.id}, correo=${correo_electronico}`);
        // Responder con los datos descifrados
        res.status(201).json({
            message: 'Registro exitoso',
            user: {
                ...newUser.toJSON(),
                nombre: descifrarDato(newUser.nombre),
                correo_electronico: descifrarDato(newUser.correo_electronico),
                cedula_identidad: descifrarDato(newUser.cedula_identidad),
                direccion: descifrarDato(newUser.direccion)
            }
        });

    } catch (error) {
        logger.error(`[USUARIO] Error en el registro: ${error.message}`);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los usuarios, incluidos los eliminados
usersCtl.getUsuarios = async (req, res) => {
    const logger = getLogger(req);
    logger.info('[USUARIO] Solicitud de listado de usuarios');
    try {
        const usuarios = await usuario.findAll();
        // Descifra los campos antes de enviar
        const usuariosDescifrados = usuarios.map(u => ({
            ...u.toJSON(),
            nombre: descifrarDato(u.nombre),
            correo_electronico: descifrarDato(u.correo_electronico),
            cedula_identidad: descifrarDato(u.cedula_identidad),
            direccion: descifrarDato(u.direccion)
        }));
        res.status(200).json(usuariosDescifrados);
    } catch (error) {
        logger.error(`[USUARIO] Error al obtener los usuarios: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
};

// Obtener un usuario por ID
usersCtl.getUsuarioById = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[USUARIO] Solicitud de usuario por ID: ${req.params.id}`);
    try {
        const user = await usuario.findByPk(req.params.id);
        if (user && user.estado === 'activo') {
            // Descifra los campos antes de enviar
            res.status(200).json({
                ...user.toJSON(),
                nombre: descifrarDato(user.nombre),
                correo_electronico: descifrarDato(user.correo_electronico),
                cedula_identidad: descifrarDato(user.cedula_identidad),
                direccion: descifrarDato(user.direccion)
            });
        } else {
            logger.warn(`[USUARIO] Usuario no encontrado: id=${req.params.id}`);
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        logger.error(`[USUARIO] Error al obtener el usuario: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
};

// Actualizar un usuario por ID
usersCtl.updateUsuario = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[USUARIO] Actualización de usuario: id=${req.params.id}`);
    const validStates = ['activo', 'eliminado'];
    try {
        const user = await usuario.findByPk(req.params.id);
        if (user) {
            // Validar que el estado es un valor ENUM válido si está presente
            if (req.body.estado !== undefined && !validStates.includes(req.body.estado)) {
                logger.warn(`[USUARIO] Actualización fallida: estado inválido (${req.body.estado})`);
                return res.status(400).json({ message: `El estado debe ser uno de los siguientes valores: ${validStates.join(', ')}.` });
            }

            // Cifrar campos sensibles si se actualizan (como antes funcionaba)
            if (req.body.nombre !== undefined) {
                req.body.nombre = cifrarDato(req.body.nombre);
            }
            if (req.body.cedula_identidad !== undefined) {
                req.body.cedula_identidad = cifrarDato(req.body.cedula_identidad);
            }
            if (req.body.direccion !== undefined) {
                req.body.direccion = cifrarDato(req.body.direccion);
            }

            // SOLO procesar correo_electronico si realmente cambió
            if (req.body.correo_electronico !== undefined && req.body.correo_electronico !== descifrarDato(user.correo_electronico)) {
                let correoPlano = req.body.correo_electronico;
                if (!correoPlano || correoPlano.trim() === '') {
                    logger.warn(`[USUARIO] Actualización fallida: el correo electrónico no puede estar vacío.`);
                    return res.status(400).json({ message: 'El correo electrónico no puede estar vacío.' });
                }
                try {
                    correoPlano = descifrarDato(correoPlano);
                } catch (e) {}
                req.body.correo_electronico = cifrarDato(correoPlano);
                req.body.correo_hash = hashCorreo(correoPlano);
                // Verificar si el nuevo correo ya existe en otro usuario
                const existingUserWithNewEmail = await usuario.findOne({ where: { correo_hash: req.body.correo_hash } });
                if (existingUserWithNewEmail && existingUserWithNewEmail.id !== parseInt(req.params.id)) {
                    logger.warn(`[USUARIO] Actualización fallida: el nuevo correo (${correoPlano}) ya está en uso.`);
                    return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
                }
            } else {
                // Si no se cambia el correo, no lo actualices ni lo incluyas en el update
                delete req.body.correo_electronico;
                delete req.body.correo_hash;
            }

            if (req.body.contrasena) {
                const hashedPassword = await bcrypt.hash(req.body.contrasena, 10);
                req.body.contrasena_hash = hashedPassword;
                delete req.body.contrasena;
            }

            // Solo actualiza los campos permitidos
            const camposPermitidos = [
                'nombre', 'correo_electronico', 'correo_hash', 'cedula_identidad', 'direccion', 'estado', 'contrasena_hash'
            ];
            const datosActualizar = {};
            for (const campo of camposPermitidos) {
                if (req.body[campo] !== undefined) {
                    datosActualizar[campo] = req.body[campo];
                }
            }

            // Validar que al menos un campo permitido se esté actualizando
            if (Object.keys(datosActualizar).length === 0) {
                logger.warn(`[USUARIO] No se enviaron campos válidos para actualizar: id=${req.params.id}`);
                return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar.' });
            }

            // Volver a la lógica anterior: pasar los campos cifrados directamente
            await user.update(datosActualizar);
            logger.info(`[USUARIO] Usuario actualizado correctamente: id=${user.id}`);
            res.status(200).json({
                ...user.toJSON(),
                nombre: descifrarDato(user.nombre),
                correo_electronico: descifrarDato(user.correo_electronico),
                cedula_identidad: descifrarDato(user.cedula_identidad),
                direccion: descifrarDato(user.direccion)
            });
        } else {
            logger.warn(`[USUARIO] Usuario no encontrado para actualizar: id=${req.params.id}`);
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        logger.error(`[USUARIO] Error al actualizar el usuario: ${error.message}`);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
};

// Borrar un usuario por ID (Marcar como eliminado)
usersCtl.deleteUsuario = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[USUARIO] Eliminación de usuario: id=${req.params.id}`);
    try {
        const user = await usuario.findByPk(req.params.id);
        if (user && user.estado === 'activo') {
            // Marcar el usuario como eliminado
            await user.update({ estado: 'eliminado' });
            logger.info(`[USUARIO] Usuario marcado como eliminado: id=${user.id}`);
            res.status(204).send();
        } else if (user && user.estado === 'eliminado') {
            logger.warn(`[USUARIO] Usuario ya eliminado: id=${user.id}`);
            res.status(404).json({ error: 'Usuario ya ha sido eliminado' });
        } else {
            logger.warn(`[USUARIO] Usuario no encontrado para eliminar: id=${req.params.id}`);
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        logger.error(`[USUARIO] Error al borrar el usuario: ${error.message}`);
        res.status(500).json({ error: 'Error al borrar el usuario' });
    }
};


// Registrar preferencias para un usuario ya existente
usersCtl.registrarPreferencias = async (req, res) => {
    const { id } = req.params;
    const { tema, sidebarMinimizado } = req.body;
    const usuarioIdNum = Number(id);
    try {
        const existeUsuario = await usuario.findByPk(usuarioIdNum);
        if (!existeUsuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const yaTienePreferencias = await Preferencias.findOne({ usuarioId: usuarioIdNum });
        if (yaTienePreferencias) {
            return res.status(400).json({ message: 'El usuario ya tiene preferencias registradas.' });
        }

        const preferencias = await Preferencias.create({
            usuarioId: usuarioIdNum,
            tema,
            sidebarMinimizado,
        });

        res.status(201).json({
            message: 'Preferencias guardadas exitosamente.',
            preferencias,
        });
    } catch (error) {
        console.error('Error al registrar preferencias:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Obtener un usuario y sus preferencias
usersCtl.getUsuarioConPreferencias = async (req, res) => {
    const { id } = req.params;
    const usuarioIdNum = Number(id);
    try {
        const usuarioData = await usuario.findByPk(usuarioIdNum);
        if (!usuarioData) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        const preferenciasData = await Preferencias.findOne({ usuarioId: usuarioIdNum });
        res.status(200).json({
            usuario: usuarioData,
            preferencias: preferenciasData,
        });
    } catch (error) {
        console.error('Error al obtener usuario y preferencias:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// Actualizar preferencias de un usuario existente
usersCtl.actualizarPreferencias = async (req, res) => {
    const { id } = req.params;
    const { tema, sidebarMinimizado, estado } = req.body;
    const usuarioIdNum = Number(id);
    try {
        const preferencias = await Preferencias.findOne({ usuarioId: usuarioIdNum });
        if (!preferencias) {
            return res.status(404).json({ message: 'No existen preferencias para este usuario.' });
        }

        if (tema !== undefined) preferencias.tema = tema;
        if (sidebarMinimizado !== undefined) preferencias.sidebarMinimizado = sidebarMinimizado;
        if (estado !== undefined) preferencias.estado = estado;

        await preferencias.save();

        res.status(200).json({ message: 'Preferencias actualizadas correctamente.', preferencias });
    } catch (error) {
        console.error('Error al actualizar preferencias:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Eliminar (lógicamente) las preferencias del usuario
usersCtl.eliminarPreferencias = async (req, res) => {
    const { id } = req.params;
    const usuarioIdNum = Number(id);
    try {
        const preferencias = await Preferencias.findOne({ usuarioId: usuarioIdNum });
        if (!preferencias) {
            return res.status(404).json({ message: 'No existen preferencias para este usuario.' });
        }
        if (preferencias.estado === 'eliminado') {
            return res.status(400).json({ message: 'Las preferencias ya están eliminadas.' });
        }
        preferencias.estado = 'eliminado';
        await preferencias.save();

        res.status(200).json({ message: 'Preferencias eliminadas correctamente.' });
    } catch (error) {
        console.error('Error al eliminar preferencias:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// LOGIN DE USUARIO (para /login)
usersCtl.loginUsuario = async (req, res) => {
    const { correo_electronico, contrasena } = req.body;
    try {
        // Hash del correo recibido
        const correoHash = hashCorreo(correo_electronico);
        console.log('DEBUG - Correo recibido:', correo_electronico);
        console.log('DEBUG - Hash para búsqueda:', correoHash);

        // Busca el usuario por hash
        const user = await usuario.findOne({ where: { correo_hash: correoHash } });
        if (!user) {
            console.log('DEBUG - Usuario NO encontrado con ese hash');
            return res.status(400).json({ message: 'Correo o contraseña incorrectos.' });
        } else {
            console.log('DEBUG - Usuario encontrado:', user.id);
        }

        // Compara la contraseña
        const passwordMatch = await bcrypt.compare(contrasena, user.contrasena_hash);
        console.log('DEBUG - Password match:', passwordMatch);
        if (!passwordMatch) {
            return res.status(400).json({ message: 'Correo o contraseña incorrectos.' });
        }

        // Guardar sesión para el usuario
        req.session.usuarioId = user.id;
        req.session.usuarioNombre = descifrarDato(user.nombre);
        req.session.usuarioEmail = descifrarDato(user.correo_electronico);
        req.session.tipoUsuario = 'usuario';
        console.log('DEBUG - Sesión guardada para usuario:', user.id);

        // Descifra los datos antes de responder
        res.status(200).json({
            usuario_id: user.id,
            nombre: descifrarDato(user.nombre),
            correo_electronico: descifrarDato(user.correo_electronico),
            cedula_identidad: descifrarDato(user.cedula_identidad),
            direccion: descifrarDato(user.direccion),
            estado: user.estado
        });
    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Exportar el controlador
module.exports = usersCtl;
