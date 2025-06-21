const { usuario } = require('../Database/dataBase.orm'); // Modelo relacional
const Preferencias = require('../models/preferencias.model'); // Modelo no relacional
const bcrypt = require('bcryptjs');

// Controlador de usuarios
const usersCtl = {};

// Crear un nuevo usuario
usersCtl.crearUsuario = async (req, res, next) => {
    const { nombre, correo_electronico, cedula_identidad, direccion, estado, contrasena } = req.body;

    try {
        // Verificar si el usuario ya existe
        const existingUser = await usuario.findOne({ where: { correo_electronico } });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // Validar que el estado es un valor ENUM válido
        const validStates = ['activo', 'eliminado'];
        if (!validStates.includes(estado)) {
            return res.status(400).json({ message: 'El estado debe ser uno de los siguientes valores: activo, eliminado.' });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        // Crear un nuevo usuario
        const newUser = await usuario.create({
            nombre,
            correo_electronico,
            cedula_identidad,
            direccion,
            estado, // El estado ahora debe ser 'activo' o 'eliminado'
            contrasena_hash: hashedPassword
        });

        // Responder con el nuevo usuario
        res.status(201).json({ message: 'Registro exitoso', user: newUser });

    } catch (error) {
        console.error('Error en el registro del usuario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los usuarios, incluidos los eliminados
usersCtl.getUsuarios = async (req, res) => {
    try {
        // Obtener todos los usuarios sin filtrar por estado
        const usuarios = await usuario.findAll(); // Esto incluye tanto 'activo' como 'eliminado'
        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al obtener los usuarios:', error.message);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
};

// Obtener un usuario por ID
usersCtl.getUsuarioById = async (req, res) => {
    try {
        const user = await usuario.findByPk(req.params.id);
        if (user && user.estado === 'activo') {
            res.status(200).json(user);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el usuario:', error.message);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
};

// Actualizar un usuario por ID
usersCtl.updateUsuario = async (req, res) => {
    const validStates = ['activo', 'eliminado']; // Definir aquí el array de estados válidos

    try {
        const user = await usuario.findByPk(req.params.id);
        if (user) {
            // Validar que el estado es un valor ENUM válido si está presente
            if (req.body.estado !== undefined && !validStates.includes(req.body.estado)) {
                return res.status(400).json({ message: `El estado debe ser uno de los siguientes valores: ${validStates.join(', ')}.` });
            }

            // Si se envía una nueva contraseña, hashearla antes de actualizar
            if (req.body.contrasena) {
                const hashedPassword = await bcrypt.hash(req.body.contrasena, 10);
                req.body.contrasena_hash = hashedPassword;
                delete req.body.contrasena; // Eliminar la contraseña en texto plano
            }

            await user.update(req.body);
            res.status(200).json(user);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el usuario:', error.message);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
};

// Borrar un usuario por ID (Marcar como eliminado)
usersCtl.deleteUsuario = async (req, res) => {
    try {
        const user = await usuario.findByPk(req.params.id);
        if (user && user.estado === 'activo') {
            // Marcar el usuario como eliminado
            await user.update({ estado: 'eliminado' });
            res.status(204).send();
        } else if (user && user.estado === 'eliminado') {
            res.status(404).json({ error: 'Usuario ya ha sido eliminado' });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el usuario:', error.message);
        res.status(500).json({ error: 'Error al borrar el usuario' });
    }
};


// Registrar preferencias para un usuario ya existente
usersCtl.registrarPreferencias = async (req, res) => {
    const { id } = req.params;
    const { tema, colores, fuente, botonPrincipal, barraSuperior } = req.body;


    try {
        // Verificar que el usuario exista en MySQL
        const existeUsuario = await usuario.findByPk(id);
        if (!existeUsuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Validar si ya existen preferencias para ese usuario
        const yaTienePreferencias = await Preferencias.findOne({ usuarioId: id });
        if (yaTienePreferencias) {
            return res.status(400).json({ message: 'El usuario ya tiene preferencias registradas.' });
        }

        // Guardar las preferencias en Mongo
        const preferencias = await Preferencias.create({
            usuarioId: id,
            origen: 'usuario',
            tema,
            colores: {
                fondo: colores.fondo,
                texto: colores.texto,
                botones: colores.botones,
                sidebar: colores.sidebar,
                inicio: colores.inicio,
                botonPrincipal,
                barraSuperior
            },
            fuente,
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

    try {
        // Paso 1: Obtiene el usuario desde la base relacional (MySQL)
        const usuarioData = await usuario.findByPk(id);

        if (!usuarioData) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Paso 2: Obtiene las preferencias desde la base no relacional (MongoDB)
        const preferenciasData = await Preferencias.findOne({ usuarioId: id });

        res.status(200).json({
            usuario: usuarioData,    //  Información del usuario desde MySQL
            preferencias: preferenciasData, // Información de preferencias desde MongoDB
        });
    } catch (error) {
        console.error('Error al obtener usuario y preferencias:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// Actualizar preferencias de un usuario existente
usersCtl.actualizarPreferencias = async (req, res) => {
    const { id } = req.params;
    const { tema, colores, fuente, botonPrincipal, barraSuperior, estado } = req.body;

    const estadosValidos = ['activo', 'eliminado'];

    try {
        // Verificar que existan preferencias
        const preferencias = await Preferencias.findOne({ usuarioId: id });
        if (!preferencias) {
            return res.status(404).json({ message: 'Preferencias no encontradas para este usuario.' });
        }

        // Actualizar los campos si se proporcionan
        if (colores !== undefined) {
            const camposColor = ['fondo', 'texto', 'botones', 'sidebar', 'inicio', 'botonPrincipal', 'barraSuperior'];
            camposColor.forEach(campo => {
                if (colores[campo] !== undefined) {
                    preferencias.colores[campo] = colores[campo];
                }
            });
        }
        if (fuente !== undefined) preferencias.fuente = fuente;
        if (estado !== undefined) {
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({ message: 'Estado inválido. Debe ser "activo" o "eliminado".' });
            }
            preferencias.estado = estado;
        }

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

    try {
        const preferencias = await Preferencias.findOne({ usuarioId: id });

        if (!preferencias) {
            return res.status(404).json({ message: 'Preferencias no encontradas para este usuario.' });
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

// Exportar el controlador
module.exports = usersCtl;
