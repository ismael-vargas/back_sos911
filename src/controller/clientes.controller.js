const bcrypt = require('bcrypt');
const { cliente } = require('../Database/dataBase.orm');
const Preferencias = require('../models/preferencias.model'); // modelo de Mongo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');
const CryptoJS = require('crypto-js');

function hashCorreo(correo) {
  return CryptoJS.SHA256(correo).toString(CryptoJS.enc.Hex);
}

// Utilidad para obtener el logger desde req.app
function getLogger(req) {
  return req.app && req.app.get ? req.app.get('logger') : console;
}

// Crear un nuevo cliente
const crearCliente = async (req, res) => {
  const logger = getLogger(req);
  let { nombre, correo_electronico, cedula_identidad, direccion, contrasena_hash, estado_eliminado = 'activo', numero_ayudas = 0 } = req.body;
  logger.info(`[CLIENTE] Intento de registro: correo=${correo_electronico}, nombre=${nombre}`);
  try {
    if (!nombre || !correo_electronico || !cedula_identidad || !direccion || !contrasena_hash) {
      logger.warn('[CLIENTE] Registro fallido: campos obligatorios faltantes');
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    // Cifrar los campos sensibles
    const nombreCif = cifrarDato(nombre);
    const correoCif = cifrarDato(correo_electronico);
    const correoHash = hashCorreo(correo_electronico);
    const cedulaCif = cifrarDato(cedula_identidad);
    const direccionCif = cifrarDato(direccion);

    // Verificar si el cliente ya existe (busca por hash)
    const existingCliente = await cliente.findOne({ where: { correo_hash: correoHash } });
    if (existingCliente) {
      logger.warn(`[CLIENTE] Registro fallido: correo ya registrado (${correo_electronico})`);
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(contrasena_hash, 10);

    // Crear un nuevo cliente
    const nuevoCliente = await cliente.create({
      nombre: nombreCif,
      correo_electronico: correoCif,
      correo_hash: correoHash,
      cedula_identidad: cedulaCif,
      direccion: direccionCif,
      contrasena_hash: hashedPassword,
      estado_eliminado,
      numero_ayudas,
    });
    logger.info(`[CLIENTE] Registro exitoso: id=${nuevoCliente.id}, correo=${correo_electronico}`);
    // Responder con los datos descifrados
    res.status(201).json({
      message: 'Cliente creado exitosamente.',
      cliente: {
        ...nuevoCliente.toJSON(),
        nombre: descifrarDato(nuevoCliente.nombre),
        correo_electronico: descifrarDato(nuevoCliente.correo_electronico),
        cedula_identidad: descifrarDato(nuevoCliente.cedula_identidad),
        direccion: descifrarDato(nuevoCliente.direccion)
      }
    });
  } catch (error) {
    logger.error(`[CLIENTE] Error al crear cliente: ${error.message}`);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Obtener todos los clientes
const getClientes = async (req, res) => {
  const logger = getLogger(req);
  logger.info('[CLIENTE] Solicitud de listado de clientes');
  try {
    const clientesList = await cliente.findAll({ where: { estado_eliminado: 'activo' } });
    const clientesDescifrados = clientesList.map(c => ({
      ...c.toJSON(),
      nombre: descifrarDato(c.nombre),
      correo_electronico: descifrarDato(c.correo_electronico),
      cedula_identidad: descifrarDato(c.cedula_identidad),
      direccion: descifrarDato(c.direccion)
    }));
    res.status(200).json(clientesDescifrados);
  } catch (error) {
    logger.error(`[CLIENTE] Error al obtener los clientes: ${error.message}`);
    res.status(500).json({ error: 'Error al obtener los clientes' });
  }
};

// Obtener un cliente por ID
const getClienteById = async (req, res) => {
  const logger = getLogger(req);
  logger.info(`[CLIENTE] Solicitud de cliente por ID: ${req.params.id}`);
  try {
    const c = await cliente.findByPk(req.params.id);
    if (c && c.estado_eliminado === 'activo') {
      res.status(200).json({
        ...c.toJSON(),
        nombre: descifrarDato(c.nombre),
        correo_electronico: descifrarDato(c.correo_electronico),
        cedula_identidad: descifrarDato(c.cedula_identidad),
        direccion: descifrarDato(c.direccion)
      });
    } else {
      logger.warn(`[CLIENTE] Cliente no encontrado: id=${req.params.id}`);
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    logger.error(`[CLIENTE] Error al obtener el cliente: ${error.message}`);
    res.status(500).json({ error: 'Error al obtener el cliente' });
  }
};

// Actualizar un cliente por ID
const updateCliente = async (req, res) => {
  const logger = getLogger(req);
  logger.info(`[CLIENTE] Actualización de cliente: id=${req.params.id}`);
  try {
    const c = await cliente.findByPk(req.params.id);
    if (c && c.estado_eliminado === 'activo') {
      // Cifrar campos sensibles si se actualizan
      if (req.body.nombre !== undefined) {
        req.body.nombre = cifrarDato(req.body.nombre);
      }
      if (req.body.cedula_identidad !== undefined) {
        req.body.cedula_identidad = cifrarDato(req.body.cedula_identidad);
      }
      if (req.body.direccion !== undefined) {
        req.body.direccion = cifrarDato(req.body.direccion);
      }
      if (req.body.correo_electronico !== undefined) {
        let correoPlano = req.body.correo_electronico;
        try {
          correoPlano = descifrarDato(correoPlano);
        } catch (e) {}
        req.body.correo_electronico = cifrarDato(correoPlano);
        req.body.correo_hash = hashCorreo(correoPlano);
      }
      if (req.body.contrasena_hash) {
        req.body.contrasena_hash = await bcrypt.hash(req.body.contrasena_hash, 10);
      }
      await c.update(req.body);
      logger.info(`[CLIENTE] Cliente actualizado correctamente: id=${c.id}`);
      res.status(200).json({
        ...c.toJSON(),
        nombre: descifrarDato(c.nombre),
        correo_electronico: descifrarDato(c.correo_electronico),
        cedula_identidad: descifrarDato(c.cedula_identidad),
        direccion: descifrarDato(c.direccion)
      });
    } else {
      logger.warn(`[CLIENTE] Cliente no encontrado para actualizar: id=${req.params.id}`);
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    logger.error(`[CLIENTE] Error al actualizar el cliente: ${error.message}`);
    res.status(500).json({ error: 'Error al actualizar el cliente' });
  }
};

// Borrar un cliente por ID (Marcar como eliminado)
const deleteCliente = async (req, res) => {
  const logger = getLogger(req);
  logger.info(`[CLIENTE] Eliminación de cliente: id=${req.params.id}`);
  try {
    const clientes = await cliente.findByPk(req.params.id);
    if (clientes && clientes.estado_eliminado === 'activo') {
      await clientes.update({ estado_eliminado: 'eliminado' });
      logger.info(`[CLIENTE] Cliente marcado como eliminado: id=${clientes.id}`);
      res.status(204).send();
    } else {
      logger.warn(`[CLIENTE] Cliente no encontrado para eliminar: id=${req.params.id}`);
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    logger.error(`[CLIENTE] Error al borrar el cliente: ${error.message}`);
    res.status(500).json({ error: 'Error al borrar el cliente' });
  }
};

const loginCliente = async (req, res) => {
  const logger = getLogger(req);
  const { correo_electronico, contrasena_hash } = req.body;
  logger.info(`[CLIENTE] Intento de login: correo=${correo_electronico}`);
  try {
    // Validación básica
    if (!correo_electronico || !contrasena_hash) {
      logger.warn('[CLIENTE] Login fallido: email o contraseña faltantes');
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por hash del correo (como en usuarios)
    const correoHash = hashCorreo(correo_electronico);
    logger.info(`[CLIENTE] Hash para búsqueda: ${correoHash}`);
    const user = await cliente.findOne({
      where: {
        correo_hash: correoHash,
        estado_eliminado: 'activo'
      }
    });
    if (!user) {
      logger.warn(`[CLIENTE] Login fallido: usuario no encontrado (${correo_electronico})`);
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    } else {
      logger.info(`[CLIENTE] Usuario encontrado: ${user.id}`);
    }

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(contrasena_hash, user.contrasena_hash);
    logger.info(`[CLIENTE] Password match: ${isMatch}`);
    if (!isMatch) {
      logger.warn(`[CLIENTE] Login fallido: contraseña incorrecta para usuario id=${user.id}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // Respuesta exitosa (sin token JWT)
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        nombre: descifrarDato(user.nombre),
        email: descifrarDato(user.correo_electronico)
      }
    });

  } catch (error) {
    logger.error(`[CLIENTE] Error en login: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }

};

// Registrar preferencias de un cliente
const registrarPreferenciasCliente = async (req, res) => {
  const { id } = req.params; // clienteId
  const { tema, colores, fuente } = req.body;

  try {
    const clienteExistente = await cliente.findByPk(id);
    if (!clienteExistente || clienteExistente.estado_eliminado === 'eliminado') {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    const yaTienePreferencias = await Preferencias.findOne({ clienteId: id });
    if (yaTienePreferencias) {
      return res.status(400).json({ message: 'Este cliente ya tiene preferencias registradas.' });
    }
    
    const nuevasPreferencias = await Preferencias.create({
      clienteId: id,
      origen: 'cliente',
      tema,
      colores: {
        fondo: colores.fondo,
        texto: colores.texto,
        botones: colores.botones,
        sidebar: colores.sidebar,
        inicio: colores.inicio,
        botonPrincipal: colores.botonPrincipal,  // usar directamente desde colores
        barraSuperior: colores.barraSuperior     // usar directamente desde colores
      },
      fuente
    });
    // Guardar preferencias en MongoDB
    res.status(201).json({
      message: 'Preferencias del cliente guardadas exitosamente.',
      preferencias: nuevasPreferencias,
    });
  } catch (error) {
    console.error('Error al registrar preferencias del cliente:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Obtener un cliente y sus preferencias
const getClienteConPreferencias = async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar cliente en MySQL
    const clienteExistente = await cliente.findByPk(id);
    if (!clienteExistente || clienteExistente.estado_eliminado === 'eliminado') {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    // Buscar preferencias en MongoDB
    const preferencias = await Preferencias.findOne({ clienteId: id });

    res.status(200).json({
      cliente: clienteExistente,
      preferencias: preferencias || null, // por si aún no tiene
    });
  } catch (error) {
    console.error('Error al obtener cliente y preferencias:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Actualizar preferencias de un cliente existente
const actualizarPreferenciasCliente = async (req, res) => {
  const { id } = req.params;
  const { tema, colores, fuente, botonPrincipal, barraSuperior, estado } = req.body;

  try {
    const clienteExistente = await cliente.findByPk(id);
    if (!clienteExistente || clienteExistente.estado_eliminado === 'eliminado') {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    const preferencias = await Preferencias.findOne({ clienteId: id });
    if (!preferencias) {
      return res.status(404).json({ message: 'No hay preferencias registradas para este cliente.' });
    }

    // Actualizar campos uno por uno
    if (tema !== undefined) preferencias.tema = tema;
    if (fuente !== undefined) preferencias.fuente = fuente;
    if (estado !== undefined) {
      if (!['activo', 'eliminado'].includes(estado)) {
        return res.status(400).json({ message: 'El estado debe ser "activo" o "eliminado".' });
      }
      preferencias.estado = estado;
    }
    if (colores !== undefined) {
      const camposColor = ['fondo', 'texto', 'botones', 'sidebar', 'inicio', 'botonPrincipal', 'barraSuperior'];
      camposColor.forEach(campo => {
        if (colores[campo] !== undefined) {
          preferencias.colores[campo] = colores[campo];
        }
      });
    }
    // Si se envían directamente botonPrincipal o barraSuperior en el body raíz
    if (botonPrincipal !== undefined) preferencias.colores.botonPrincipal = botonPrincipal;
    if (barraSuperior !== undefined) preferencias.colores.barraSuperior = barraSuperior;

    await preferencias.save();

    res.status(200).json({
      message: 'Preferencias del cliente actualizadas exitosamente.',
      preferencias,
    });
  } catch (error) {
    console.error('Error al actualizar preferencias del cliente:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Eliminar preferencias de un cliente (cambiar estado a 'eliminado' o 'activo')
const eliminarPreferenciasCliente = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body; // 'activo' o 'eliminado'

  try {
    const preferencias = await Preferencias.findOne({ clienteId: id });
    if (!preferencias) {
      return res.status(404).json({ message: 'Preferencias no encontradas.' });
    }

    if (!['activo', 'eliminado'].includes(estado)) {
      return res.status(400).json({ message: 'El estado debe ser "activo" o "eliminado".' });
    }

    preferencias.estado = estado;
    await preferencias.save();

    res.status(200).json({
      message: `Preferencias ${estado === 'activo' ? 'activadas' : 'eliminadas'} correctamente.`,
      preferencias
    });
  } catch (error) {
    console.error('Error al cambiar estado de las preferencias del cliente:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
// Exportar las funciones del controlador
module.exports = {
  crearCliente,
  getClientes,
  getClienteById,
  updateCliente,
  deleteCliente,
  loginCliente,
  registrarPreferenciasCliente,
  getClienteConPreferencias,      // <- ESTO FALTABA
  actualizarPreferenciasCliente,  // <- ESTO FALTABA
  eliminarPreferenciasCliente     // <- ESTO FALTABA
};

