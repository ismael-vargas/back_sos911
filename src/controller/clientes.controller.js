const bcrypt = require('bcrypt');
const { cliente } = require('../Database/dataBase.orm');
const Preferencias = require('../models/preferencias.model'); // modelo de Mongo


// Crear un nuevo cliente
const crearCliente = async (req, res) => {
  const { nombre, correo_electronico, cedula_identidad, direccion, estado = 'activo', contrasena_hash, estado_eliminado = 'activo', numero_ayudas = 0 } = req.body;

  try {
    if (!nombre || !correo_electronico || !cedula_identidad || !direccion || !estado || !contrasena_hash) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    const validStates = ['activo', 'inactivo'];
    if (!validStates.includes(estado)) {
      return res.status(400).json({ message: 'El estado debe ser activo o inactivo.' });
    }

    const hashedPassword = await bcrypt.hash(contrasena_hash, 10);

    const nuevoCliente = await cliente.create({
      nombre,
      correo_electronico,
      cedula_identidad,
      direccion,
      estado,
      contrasena_hash: hashedPassword,
      estado_eliminado,
      numero_ayudas,
    });

    res.status(201).json({ message: 'Cliente creado exitosamente.', cliente: nuevoCliente });
  } catch (error) {
    console.error('Error al crear cliente:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Obtener todos los clientes
const getClientes = async (req, res) => {
  try {
    const clientes = await cliente.findAll({ where: { estado_eliminado: 'activo' } });
    res.status(200).json(clientes);
  } catch (error) {
    console.error('Error al obtener los clientes:', error.message);
    res.status(500).json({ error: 'Error al obtener los clientes' });
  }
};

// Obtener un cliente por ID
const getClienteById = async (req, res) => {
  try {
    const clientes = await cliente.findByPk(req.params.id);
    if (clientes && clientes.estado_eliminado === 'activo') {
      res.status(200).json(clientes);
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener el cliente:', error.message);
    res.status(500).json({ error: 'Error al obtener el cliente' });
  }
};

// Actualizar un cliente por ID
const updateCliente = async (req, res) => {
  const validStates = ['activo', 'inactivo'];

  try {
    const clientes = await cliente.findByPk(req.params.id);
    if (clientes && clientes.estado_eliminado === 'activo') {
      if (req.body.estado !== undefined && !validStates.includes(req.body.estado)) {
        return res.status(400).json({ message: `El estado debe ser uno de los siguientes valores: ${validStates.join(', ')}.` });
      }
      await clientes.update(req.body);
      res.status(200).json(clientes);
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    console.error('Error al actualizar el cliente:', error.message);
    res.status(500).json({ error: 'Error al actualizar el cliente' });
  }
};

// Borrar un cliente por ID (Marcar como eliminado)
const deleteCliente = async (req, res) => {
  try {
    const clientes = await cliente.findByPk(req.params.id);
    if (clientes && clientes.estado_eliminado === 'activo') {
      await clientes.update({ estado_eliminado: 'eliminado' });
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    console.error('Error al borrar el cliente:', error.message);
    res.status(500).json({ error: 'Error al borrar el cliente' });
  }
};
const loginCliente = async (req, res) => {
  const { correo_electronico, contrasena_hash } = req.body;

  try {
    // Validación básica
    if (!correo_electronico || !contrasena_hash) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const user = await cliente.findOne({
      where: {
        correo_electronico,
        estado_eliminado: 'activo'
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // Comparar contraseñas (usa bcrypt.compareSync si prefieres sincrónico)
    const isMatch = await bcrypt.compare(contrasena_hash, user.contrasena_hash);

    if (!isMatch) {
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
        nombre: user.nombre,
        email: user.correo_electronico
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
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
  const { tema, colores, fuente, botonPrincipal, barraSuperior } = req.body;

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
    if (tema) preferencias.tema = tema;
    if (fuente) preferencias.fuente = fuente;

    if (colores) {
      const camposColor = ['fondo', 'texto', 'botones', 'sidebar', 'inicio', 'botonPrincipal', 'barraSuperior'];
      camposColor.forEach(campo => {
        if (colores[campo] !== undefined) {
          preferencias.colores[campo] = colores[campo];
        }
      });
    }

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

