const { clientes_numeros } = require('../Database/dataBase.orm'); // Asegúrate de que la ruta sea correcta

const clientesNumerosCtl = {};

// Crear un nuevo número de cliente
clientesNumerosCtl.crearClientesNumero = async (req, res, next) => {
    const { cliente_id, numero } = req.body;
    try {
        // Verificar si el número de cliente ya existe para el cliente especificado
        const existingClienteNumero = await clientes_numeros.findOne({ where: { cliente_id, numero } });
        if (existingClienteNumero) {
            return res.status(400).json({ message: 'El número de cliente ya está registrado para este cliente.' });
        }

        // Crear un nuevo número de cliente
        const newClienteNumero = await clientes_numeros.create({
            cliente_id,
            numero
        });

        // Responder con el nuevo número de cliente
        res.status(201).json({ message: 'Registro exitoso', clienteNumero: newClienteNumero });

    } catch (error) {
        console.error('Error en el registro del número de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los números de clientes
clientesNumerosCtl.getClientesNumeros = async (req, res) => {
    try {
        const clientesNumeros = await clientes_numeros.findAll({ where: { estado: 'activo' } });
        res.status(200).json(clientesNumeros);
    } catch (error) {
        console.error('Error al obtener los números de clientes:', error.message);
        res.status(500).json({ error: 'Error al obtener los números de clientes' });
    }
};

// Obtener un número de cliente por ID
clientesNumerosCtl.getClientesNumeroById = async (req, res) => {
    try {
        const clienteNumero = await clientes_numeros.findByPk(req.params.id);
        if (clienteNumero && clienteNumero.estado === 'activo') {
            res.status(200).json(clienteNumero);
        } else {
            res.status(404).json({ error: 'Número de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el número de cliente:', error.message);
        res.status(500).json({ error: 'Error al obtener el número de cliente' });
    }
};

// Actualizar un número de cliente por ID
clientesNumerosCtl.updateClientesNumero = async (req, res) => {
    try {
        const clienteNumero = await clientes_numeros.findByPk(req.params.id);
        if (clienteNumero) {
            await clienteNumero.update(req.body);
            res.status(200).json(clienteNumero);
        } else {
            res.status(404).json({ error: 'Número de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el número de cliente:', error.message);
        res.status(500).json({ error: 'Error al actualizar el número de cliente' });
    }
};

// "Eliminar" un número de cliente por ID (cambio de estado a "inactivo")
clientesNumerosCtl.deleteClientesNumero = async (req, res) => {
    try {
        const clienteNumero = await clientes_numeros.findByPk(req.params.id);
        if (clienteNumero && clienteNumero.estado === 'activo') {
            await clienteNumero.update({ estado: 'eliminado' });
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Número de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el número de cliente:', error.message);
        res.status(500).json({ error: 'Error al borrar el número de cliente' });
    }
};

module.exports = clientesNumerosCtl;