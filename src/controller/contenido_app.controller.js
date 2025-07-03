const mongoose = require('mongoose');
const ContenidoApp2 = require('../models/contenido_app.model');

const contenidoAppCtl = {};

// Obtener el contenido global (GET /api/mobile-content)
contenidoAppCtl.getContenido = async (req, res) => {
  try {
    // Solo debe haber un documento, busca el primero
    let contenido = await ContenidoApp2.findOne();
    if (!contenido) {
      // Log para depuración
      console.log('Creando documento por defecto con secciones:', [
        { key: 'howItWorks', title: '¿Cómo funciona?', content: '' },
        { key: 'mission', title: 'Misión', content: '' },
        { key: 'vision', title: 'Visión', content: '' }
      ]);
      // Si no existe, crea uno con valores por defecto
      contenido = await ContenidoApp2.create({
        mainTitle: 'Un toque para tu seguridad',
        sections: [
          { key: 'howItWorks', title: '¿Cómo funciona?', content: '' },
          { key: 'mission', title: 'Misión', content: '' },
          { key: 'vision', title: 'Visión', content: '' }
        ]
      });
    }
    res.status(200).json(contenido);
  } catch (error) {
    console.error('Error al crear o buscar contenido:', error);
    res.status(500).json({ message: 'Error al obtener el contenido', error: error.message });
  }
};

// Actualizar el contenido global (PUT /api/mobile-content)
contenidoAppCtl.updateContenido = async (req, res) => {
  try {
    let contenido = await ContenidoApp2.findOne();
    if (!contenido) {
      contenido = new ContenidoApp2();
      contenido.fecha_creacion = new Date();
    }
    // Actualiza los campos permitidos
    const campos = ['gradientStart', 'gradientEnd', 'fontFamily', 'mainTitle', 'sections'];
    campos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        contenido[campo] = req.body[campo];
      }
    });
    // Actualiza la fecha de modificación
    contenido.fecha_modificacion = new Date();
    await contenido.save();
    res.status(200).json({ message: 'Contenido actualizado correctamente', contenido });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el contenido', error: error.message });
  }
};

// Cambiar el estado del contenido global (PATCH /api/mobile-content/estado)
contenidoAppCtl.cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['activo', 'eliminado'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido.' });
    }
    let contenido = await ContenidoApp2.findOne();
    if (!contenido) {
      return res.status(404).json({ message: 'Contenido no encontrado.' });
    }
    contenido.estado = estado;
    contenido.fecha_modificacion = new Date();
    await contenido.save();
    res.status(200).json({ message: 'Estado actualizado correctamente.', contenido });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el estado', error: error.message });
  }
};

module.exports = contenidoAppCtl;
