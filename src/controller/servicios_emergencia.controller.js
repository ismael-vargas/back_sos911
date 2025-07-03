// Controlador para servicios_emergencia
const { servicios_emergencia } = require('../Database/dataBase.orm');
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

// Crear un nuevo servicio de emergencia
const crearServicioEmergencia = async (req, res) => {
  try {
    const { nombre, descripcion, telefono, estado = 'activo', usuario_id } = req.body;
    if (!nombre || !telefono || !usuario_id) {
      return res.status(400).json({ message: 'Nombre, teléfono y usuario_id son obligatorios.' });
    }
    // Cifrar los campos sensibles
    const nombreCif = cifrarDato(nombre);
    const descripcionCif = descripcion ? cifrarDato(descripcion) : null;
    const telefonoCif = cifrarDato(telefono);
    const nuevoServicio = await servicios_emergencia.create({
      nombre: nombreCif,
      descripcion: descripcionCif,
      telefono: telefonoCif,
      estado,
      usuario_id
    });
    res.status(201).json({
      message: 'Servicio de emergencia creado.',
      servicio: {
        ...nuevoServicio.toJSON(),
        nombre: descifrarDato(nuevoServicio.nombre),
        descripcion: descifrarDato(nuevoServicio.descripcion),
        telefono: descifrarDato(nuevoServicio.telefono)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el servicio.', error: error.message });
  }
};

// Obtener todos los servicios activos
const getServiciosEmergencia = async (req, res) => {
  try {
    const servicios = await servicios_emergencia.findAll({ where: { estado: 'activo' } });
    // Descifrar los campos antes de enviar
    const serviciosDescifrados = servicios.map(s => ({
      ...s.toJSON(),
      nombre: descifrarDato(s.nombre),
      descripcion: descifrarDato(s.descripcion),
      telefono: descifrarDato(s.telefono)
    }));
    res.status(200).json(serviciosDescifrados);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los servicios.', error: error.message });
  }
};

// Obtener un servicio por ID
const getServicioEmergenciaById = async (req, res) => {
  try {
    const servicio = await servicios_emergencia.findByPk(req.params.id);
    if (!servicio || servicio.estado === 'eliminado') {
      return res.status(404).json({ message: 'Servicio no encontrado.' });
    }
    // Descifrar los campos antes de enviar
    res.status(200).json({
      ...servicio.toJSON(),
      nombre: descifrarDato(servicio.nombre),
      descripcion: descifrarDato(servicio.descripcion),
      telefono: descifrarDato(servicio.telefono)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el servicio.', error: error.message });
  }
};

// Actualizar un servicio de emergencia
const updateServicioEmergencia = async (req, res) => {
  try {
    const servicio = await servicios_emergencia.findByPk(req.params.id);
    if (!servicio || servicio.estado === 'eliminado') {
      return res.status(404).json({ message: 'Servicio no encontrado.' });
    }
    let { nombre, descripcion, telefono, estado } = req.body;
    // Cifrar los campos si se actualizan
    if (nombre !== undefined) nombre = cifrarDato(nombre);
    if (descripcion !== undefined) descripcion = cifrarDato(descripcion);
    if (telefono !== undefined) telefono = cifrarDato(telefono);
    await servicio.update({
      nombre: nombre ?? servicio.nombre,
      descripcion: descripcion ?? servicio.descripcion,
      telefono: telefono ?? servicio.telefono,
      estado: estado ?? servicio.estado,
      fecha_modificacion: new Date()
    });
    res.status(200).json({
      message: 'Servicio actualizado.',
      servicio: {
        ...servicio.toJSON(),
        nombre: descifrarDato(servicio.nombre),
        descripcion: descifrarDato(servicio.descripcion),
        telefono: descifrarDato(servicio.telefono)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el servicio.', error: error.message });
  }
};

// Eliminar (marcar como eliminado) un servicio de emergencia
const deleteServicioEmergencia = async (req, res) => {
  try {
    const servicio = await servicios_emergencia.findByPk(req.params.id);
    if (!servicio || servicio.estado === 'eliminado') {
      return res.status(404).json({ message: 'Servicio no encontrado.' });
    }
    await servicio.update({ estado: 'eliminado', fecha_modificacion: new Date() });
    res.status(200).json({ message: 'Servicio eliminado.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el servicio.', error: error.message });
  }
};

module.exports = {
  crearServicioEmergencia,
  getServiciosEmergencia,
  getServicioEmergenciaById,
  updateServicioEmergencia,
  deleteServicioEmergencia
};
