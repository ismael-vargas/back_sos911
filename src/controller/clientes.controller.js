const { cliente } = require('../Database/dataBase.orm'); // Asegúrate de que la ruta sea correcta
const bcrypt = require('bcryptjs');

const clientesCtl = {};

// Crear un nuevo cliente
clientesCtl.crearCliente = async (req, res, next) => {
    const { nombre, correo_electronico, cedula_identidad, direccion, estado, contrasena_hash, numero_ayudas } = req.body;
    console.log('Datos recibidos:', { nombre, correo_electronico, cedula_identidad, direccion, estado, contrasena_hash, numero_ayudas });
    try {
        // Verificar si el cliente ya existe
        const existingCliente = await cliente.findOne({ where: { correo_electronico } });
        if (existingCliente) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // Validar que el estado es un valor ENUM válido
        const validStates = ['activo', 'inactivo'];
        if (!validStates.includes(estado)) {
            return res.status(400).json({ message: 'El estado debe ser uno de los siguientes valores: activo, inactivo.' });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(contrasena_hash, 10);

        // Crear un nuevo cliente
        const newCliente = await cliente.create({
            nombre,
            correo_electronico,
            cedula_identidad,
            direccion,
            estado, // El estado ahora debe ser 'activo' o 'inactivo'
            estado_eliminado: 'activo', // Establecer el estado de eliminación inicial como 'activo'
            contrasena_hash: hashedPassword,
            numero_ayudas
        });

        // Responder con el nuevo cliente
        res.status(201).json({ message: 'Registro exitoso', cliente: newCliente });

    } catch (error) {
        console.error('Error en el registro del cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los clientes
clientesCtl.getClientes = async (req, res) => {
    try {
        // Filtrar para obtener solo los clientes que no están eliminados
        const clientes = await cliente.findAll({
            where: { estado_eliminado: 'activo' }
        });
        res.status(200).json(clientes);
    } catch (error) {
        console.error('Error al obtener los clientes:', error.message);
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
};

// Obtener un cliente por ID
clientesCtl.getClienteById = async (req, res) => {
    try {
        const clientes = await cliente.findByPk(req.params.id);
        if (clientes && clientes.estado_eliminado === 'activo') {
            res.status(200).json(clientes);
        } else if (clientes && clientes.estado_eliminado === 'eliminado') {
            res.status(404).json({ error: 'Cliente no encontrado' });
        } else {
            res.status(404).json({ error: 'Cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el cliente:', error.message);
        res.status(500).json({ error: 'Error al obtener el cliente' });
    }
};

// Actualizar un cliente por ID
clientesCtl.updateCliente = async (req, res) => {
    const validStates = ['activo', 'inactivo']; // Definir aquí el array de estados válidos

    try {
        const clientes = await cliente.findByPk(req.params.id);
        if (clientes && clientes.estado_eliminado === 'activo') {
            // Validar que el estado es un valor ENUM válido si está presente
            if (req.body.estado !== undefined && !validStates.includes(req.body.estado)) {
                return res.status(400).json({ message: `El estado debe ser uno de los siguientes valores: ${validStates.join(', ')}.` });
            }
            await clientes.update(req.body);
            res.status(200).json(clientes);
        } else if (clientes && clientes.estado_eliminado === 'eliminado') {
            res.status(404).json({ error: 'Cliente no encontrado' });
        } else {
            res.status(404).json({ error: 'Cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el cliente:', error.message);
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
};

// Borrar un cliente por ID (Marcar como eliminado)
clientesCtl.deleteCliente = async (req, res) => {
    try {
        const clientes = await cliente.findByPk(req.params.id);
        if (clientes && clientes.estado_eliminado === 'activo') {
            // Marcar el cliente como eliminado
            await clientes.update({ estado_eliminado: 'eliminado' });
            res.status(204).send();
        } else if (clientes && clientes.estado_eliminado === 'eliminado') {
            res.status(404).json({ error: 'Cliente ya ha sido eliminado' });
        } else {
            res.status(404).json({ error: 'Cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el cliente:', error.message);
        res.status(500).json({ error: 'Error al borrar el cliente' });
    }
};

module.exports = clientesCtl;
