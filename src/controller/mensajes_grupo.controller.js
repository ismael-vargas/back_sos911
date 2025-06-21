const { mensajes_grupo, grupos, cliente } = require('../Database/dataBase.orm');

const mensajesGrupoCtl = {};

// Crear un nuevo mensaje
mensajesGrupoCtl.crearMensaje = async (req, res) => {
    const { grupo_id, cliente_id, mensaje } = req.body;

    if (!grupo_id || !cliente_id || !mensaje) {
        return res.status(400).json({ message: 'Faltan campos requeridos: grupo_id, cliente_id y mensaje.' });
    }

    try {
        const nuevoMensaje = await mensajes_grupo.create({
            grupo_id,
            cliente_id,
            mensaje,
            fecha_envio: new Date(),
            estado: 'activo'
        });

        res.status(201).json({ message: 'Mensaje creado exitosamente.', mensaje: nuevoMensaje });
    } catch (error) {
        console.error('Error al crear el mensaje:', error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Obtener todos los mensajes de un grupo
mensajesGrupoCtl.getMensajesPorGrupo = async (req, res) => {
    const { grupo_id } = req.params;

    try {
        const mensajes = await mensajes_grupo.findAll({
            where: { grupo_id, estado: 'activo' },
            include: [
                { model: cliente, attributes: ['nombre', 'correo_electronico'] }
            ]
        });

        res.status(200).json(mensajes);
    } catch (error) {
        console.error('Error al obtener los mensajes:', error.message);
        res.status(500).json({ error: 'Error al obtener los mensajes.' });
    }
};

// Eliminar un mensaje (eliminación lógica)
mensajesGrupoCtl.deleteMensaje = async (req, res) => {
    const { id } = req.params;

    try {
        const mensaje = await mensajes_grupo.findByPk(id);
        if (mensaje) {
            await mensaje.update({ estado: 'eliminado' });
            res.status(200).json({ message: 'Mensaje eliminado correctamente.' });
        } else {
            res.status(404).json({ error: 'Mensaje no encontrado.' });
        }
    } catch (error) {
        console.error('Error al eliminar el mensaje:', error.message);
        res.status(500).json({ error: 'Error al eliminar el mensaje.' });
    }
};



// Editar un mensaje existente
mensajesGrupoCtl.editarMensaje = async (req, res) => {
    const { id } = req.params;
    const { mensaje } = req.body;

    if (!mensaje) {
        return res.status(400).json({ message: 'El campo mensaje es requerido.' });
    }

    try {
        const mensajeExistente = await mensajes_grupo.findByPk(id);
        if (mensajeExistente && mensajeExistente.estado === 'activo') {
            await mensajeExistente.update({ mensaje });
            res.status(200).json({ message: 'Mensaje actualizado correctamente.', mensaje: mensajeExistente });
        } else {
            res.status(404).json({ error: 'Mensaje no encontrado o eliminado.' });
        }
    } catch (error) {
        console.error('Error al editar el mensaje:', error.message);
        res.status(500).json({ error: 'Error al editar el mensaje.' });
    }
};


module.exports = mensajesGrupoCtl;