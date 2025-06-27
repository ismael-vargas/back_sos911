const { usuario_numero, usuario } = require('../Database/dataBase.orm'); // Asegúrate de que también importes el modelo de usuario
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');
const usuarioNumeroCtl = {};

// Utilidad para obtener el logger desde req.app
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// Crear un nuevo usuarioNumero con nombre del usuario
usuarioNumeroCtl.crearUsuarioNumero = async (req, res, next) => {
    const logger = getLogger(req);
    let { nombre, numero, usuario_id } = req.body;
    logger.info(`[USUARIOS_NUMEROS] Intento de registro: nombre=${nombre}, numero=${numero}, usuario_id=${usuario_id}`);
    // Validar que los campos obligatorios estén presentes
    if (!nombre || !numero || !usuario_id) {
        logger.warn('[USUARIOS_NUMEROS] Registro fallido: campos obligatorios faltantes');
        return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, numero y usuario_id.' });
    }
    try {
        // Cifrar los campos sensibles
        const nombreCif = cifrarDato(nombre);
        const numeroCif = cifrarDato(numero);
        const nuevoUsuarioNumero = await usuario_numero.create({
            nombre: nombreCif,
            numero: numeroCif,
            usuario_id
        });
        logger.info(`[USUARIOS_NUMEROS] Registro exitoso: id=${nuevoUsuarioNumero.id}, usuario_id=${usuario_id}`);
        res.status(201).json({
            message: 'Registro exitoso',
            usuarioNumero: {
                ...nuevoUsuarioNumero.toJSON(),
                nombre: descifrarDato(nuevoUsuarioNumero.nombre),
                numero: descifrarDato(nuevoUsuarioNumero.numero)
            }
        });
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al crear el usuarioNumero: ${error.message}`);
        res.status(500).json({ error: 'Error al crear el usuarioNumero' });
    }
};

// Obtener todos los usuarioNumero activos con el nombre del usuario relacionado
usuarioNumeroCtl.getUsuarioNumero = async (req, res) => {
    const logger = getLogger(req);
    logger.info('[USUARIOS_NUMEROS] Solicitud de listado de usuarios_numeros');
    try {
        const usuariosNumeros = await usuario_numero.findAll({
            where: { estado: 'activo' },
            attributes: ['id', 'nombre', 'numero', 'estado', 'usuario_id']
        });
        // Descifrar los campos antes de enviar
        const usuariosNumerosDescifrados = usuariosNumeros.map(u => ({
            ...u.toJSON(),
            nombre: descifrarDato(u.nombre),
            numero: descifrarDato(u.numero)
        }));
        res.status(200).json(usuariosNumerosDescifrados);
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al obtener los usuariosNumeros: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los usuariosNumeros' });
    }
};

// Obtener un usuarioNumero por ID con el nombre del usuario relacionado
usuarioNumeroCtl.getUsuarioNumeroById = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[USUARIOS_NUMEROS] Solicitud de usuario_numero por ID: ${req.params.id}`);
    try {
        const usuarioNumero = await usuario_numero.findByPk(req.params.id, {
            attributes: ['id', 'nombre', 'numero', 'estado', 'usuario_id']
        });
        if (usuarioNumero && usuarioNumero.estado === 'activo') {
            res.status(200).json({
                ...usuarioNumero.toJSON(),
                nombre: descifrarDato(usuarioNumero.nombre),
                numero: descifrarDato(usuarioNumero.numero)
            });
        } else {
            logger.warn(`[USUARIOS_NUMEROS] Usuario_numero no encontrado: id=${req.params.id}`);
            res.status(404).json({ error: 'Número de usuario no encontrado' });
        }
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al obtener el número de usuario: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener el número de usuario' });
    }
};

// Actualizar un usuarioNumero por ID
usuarioNumeroCtl.updateUsuarioNumero = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[USUARIOS_NUMEROS] Actualización de usuario_numero: id=${req.params.id}`);
    try {
        const usuarioNumero = await usuario_numero.findByPk(req.params.id);
        if (usuarioNumero) {
            // Cifrar campos sensibles si se actualizan
            if (req.body.nombre !== undefined) {
                req.body.nombre = cifrarDato(req.body.nombre);
            }
            if (req.body.numero !== undefined) {
                req.body.numero = cifrarDato(req.body.numero);
            }
            await usuarioNumero.update(req.body);
            logger.info(`[USUARIOS_NUMEROS] Usuario_numero actualizado correctamente: id=${usuarioNumero.id}`);
            res.status(200).json({
                ...usuarioNumero.toJSON(),
                nombre: descifrarDato(usuarioNumero.nombre),
                numero: descifrarDato(usuarioNumero.numero)
            });
        } else {
            logger.warn(`[USUARIOS_NUMEROS] Usuario_numero no encontrado para actualizar: id=${req.params.id}`);
            res.status(404).json({ error: 'Número de usuario no encontrado' });
        }
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al actualizar el número de usuario: ${error.message}`);
        res.status(500).json({ error: 'Error al actualizar el número de usuario' });
    }
};

// "Eliminar" un usuarioNumero por ID (cambio de estado a "inactivo")
usuarioNumeroCtl.deleteUsuarioNumero = async (req, res) => {
    const logger = getLogger(req);
    logger.info(`[USUARIOS_NUMEROS] Eliminación de usuario_numero: id=${req.params.id}`);
    try {
        const usuarioNumero = await usuario_numero.findByPk(req.params.id);
        if (usuarioNumero && usuarioNumero.estado === 'activo') {
            await usuarioNumero.update({ estado: 'eliminado' });
            logger.info(`[USUARIOS_NUMEROS] Usuario_numero marcado como eliminado: id=${usuarioNumero.id}`);
            res.status(204).send();
        } else {
            logger.warn(`[USUARIOS_NUMEROS] Usuario_numero no encontrado para eliminar: id=${req.params.id}`);
            res.status(404).json({ error: 'Número de usuario no encontrado' });
        }
    } catch (error) {
        logger.error(`[USUARIOS_NUMEROS] Error al borrar el número de usuario: ${error.message}`);
        res.status(500).json({ error: 'Error al borrar el número de usuario' });
    }
};

module.exports = usuarioNumeroCtl;
