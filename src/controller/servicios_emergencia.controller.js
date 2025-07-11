// Controlador para servicios_emergencia
const { servicios_emergencia } = require('../Database/dataBase.orm');
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

// Utilidad para obtener el logger desde req.app
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// Crear un nuevo servicio de emergencia
const crearServicioEmergencia = async (req, res) => {
  const logger = getLogger(req);
  try {
    const { nombre, descripcion, telefono, estado = 'activo', usuario_id } = req.body;
    logger.info(`[SERVICIOS_EMERGENCIA] Intento de creación: usuario_id=${usuario_id}, nombre=${nombre}`);
    
    if (!nombre || !telefono || !usuario_id) {
      logger.warn(`[SERVICIOS_EMERGENCIA] Creación fallida: campos obligatorios faltantes`);
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

    // Obtener el servicio completo con todos los campos después de crearlo
    const servicioCompleto = await servicios_emergencia.findByPk(nuevoServicio.id);
    
    logger.info(`[SERVICIOS_EMERGENCIA] Servicio creado exitosamente: id=${nuevoServicio.id}`);
    
    res.status(201).json({
      ...servicioCompleto.toJSON(),
      nombre: descifrarDato(servicioCompleto.nombre),
      descripcion: servicioCompleto.descripcion ? descifrarDato(servicioCompleto.descripcion) : null,
      telefono: descifrarDato(servicioCompleto.telefono)
    });
  } catch (error) {
    logger.error(`[SERVICIOS_EMERGENCIA] Error al crear el servicio: ${error.message}`);
    res.status(500).json({ error: 'Error al crear el servicio' });
  }
};

// Obtener todos los servicios activos (o todos si se especifica incluirEliminados)
const getServiciosEmergencia = async (req, res) => {
  const logger = getLogger(req);
  const incluirEliminados = req.query.incluirEliminados === 'true';
  logger.info(`[SERVICIOS_EMERGENCIA] Solicitud de listado de servicios (incluirEliminados: ${incluirEliminados})`);
  
  try {
    const whereClause = incluirEliminados ? {} : { estado: 'activo' };
    const servicios = await servicios_emergencia.findAll({ 
      where: whereClause,
      order: [['fecha_creacion', 'DESC']]
    });
    
    // Descifrar los campos antes de enviar
    const serviciosDescifrados = servicios.map(s => {
      const servicioData = s.toJSON();
      
      try {
        servicioData.nombre = descifrarDato(servicioData.nombre);
        servicioData.descripcion = servicioData.descripcion ? descifrarDato(servicioData.descripcion) : null;
        servicioData.telefono = descifrarDato(servicioData.telefono);
      } catch (error) {
        logger.error('Error al descifrar datos del servicio:', error);
        // Mantener datos cifrados si hay error
      }
      
      return servicioData;
    });
    
    res.status(200).json(serviciosDescifrados);
  } catch (error) {
    logger.error(`[SERVICIOS_EMERGENCIA] Error al obtener los servicios: ${error.message}`);
    res.status(500).json({ error: 'Error al obtener los servicios' });
  }
};

// Obtener un servicio por ID
const getServicioEmergenciaById = async (req, res) => {
  const logger = getLogger(req);
  logger.info(`[SERVICIOS_EMERGENCIA] Solicitud de servicio por ID: ${req.params.id}`);
  
  try {
    const servicio = await servicios_emergencia.findByPk(req.params.id);
    if (!servicio || servicio.estado === 'eliminado') {
      logger.warn(`[SERVICIOS_EMERGENCIA] Servicio no encontrado: id=${req.params.id}`);
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Descifrar los campos antes de enviar
    const servicioData = servicio.toJSON();
    try {
      servicioData.nombre = descifrarDato(servicioData.nombre);
      servicioData.descripcion = servicioData.descripcion ? descifrarDato(servicioData.descripcion) : null;
      servicioData.telefono = descifrarDato(servicioData.telefono);
    } catch (error) {
      logger.error('Error al descifrar datos del servicio:', error);
      // Mantener datos cifrados si hay error
    }
    
    res.status(200).json(servicioData);
  } catch (error) {
    logger.error(`[SERVICIOS_EMERGENCIA] Error al obtener el servicio: ${error.message}`);
    res.status(500).json({ error: 'Error al obtener el servicio' });
  }
};

// Actualizar un servicio de emergencia
const updateServicioEmergencia = async (req, res) => {
  const logger = getLogger(req);
  logger.info(`[SERVICIOS_EMERGENCIA] Actualización de servicio: id=${req.params.id}`);
  
  try {
    const servicio = await servicios_emergencia.findByPk(req.params.id);
    if (!servicio) {
      logger.warn(`[SERVICIOS_EMERGENCIA] Servicio no encontrado para actualizar: id=${req.params.id}`);
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Cifrar los campos sensibles si vienen en la petición
    const datosActualizacion = { ...req.body };
    
    if (datosActualizacion.nombre !== undefined) {
      datosActualizacion.nombre = cifrarDato(datosActualizacion.nombre);
    }
    if (datosActualizacion.descripcion !== undefined) {
      datosActualizacion.descripcion = cifrarDato(datosActualizacion.descripcion);
    }
    if (datosActualizacion.telefono !== undefined) {
      datosActualizacion.telefono = cifrarDato(datosActualizacion.telefono);
    }

    await servicio.update(datosActualizacion);
    
    logger.info(`[SERVICIOS_EMERGENCIA] Servicio actualizado correctamente: id=${servicio.id}`);
    
    // Devolver los datos descifrados
    const servicioActualizado = servicio.toJSON();
    try {
      servicioActualizado.nombre = descifrarDato(servicioActualizado.nombre);
      servicioActualizado.descripcion = servicioActualizado.descripcion ? descifrarDato(servicioActualizado.descripcion) : null;
      servicioActualizado.telefono = descifrarDato(servicioActualizado.telefono);
    } catch (error) {
      logger.error('Error al descifrar datos del servicio actualizado:', error);
    }
    
    res.status(200).json(servicioActualizado);
  } catch (error) {
    logger.error(`[SERVICIOS_EMERGENCIA] Error al actualizar el servicio: ${error.message}`);
    res.status(500).json({ error: 'Error al actualizar el servicio' });
  }
};

// Eliminar (marcar como eliminado) un servicio de emergencia
const deleteServicioEmergencia = async (req, res) => {
  const logger = getLogger(req);
  logger.info(`[SERVICIOS_EMERGENCIA] Eliminación de servicio: id=${req.params.id}`);
  
  try {
    const servicio = await servicios_emergencia.findByPk(req.params.id);
    if (!servicio || servicio.estado === 'eliminado') {
      logger.warn(`[SERVICIOS_EMERGENCIA] Servicio no encontrado para eliminar: id=${req.params.id}`);
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    await servicio.update({ estado: 'eliminado' });
    logger.info(`[SERVICIOS_EMERGENCIA] Servicio marcado como eliminado: id=${servicio.id}`);
    
    res.status(204).send();
  } catch (error) {
    logger.error(`[SERVICIOS_EMERGENCIA] Error al eliminar el servicio: ${error.message}`);
    res.status(500).json({ error: 'Error al eliminar el servicio' });
  }
};

module.exports = {
  crearServicioEmergencia,
  getServiciosEmergencia,
  getServicioEmergenciaById,
  updateServicioEmergencia,
  deleteServicioEmergencia
};
