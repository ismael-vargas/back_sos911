const { clientes_numeros } = require('../Database/dataBase.orm'); // Asegúrate de que la ruta sea correcta

const clientesNumerosCtl = {};

// Crear un nuevo número de cliente
clientesNumerosCtl.crearClientesNumero = async (req, res) => {
    const { cliente_id, nombre, numero, descripcion } = req.body;

    // Validar campos requeridos
    if (!cliente_id || !nombre || !numero) {
        return res.status(400).json({ message: 'Faltan campos requeridos: cliente_id, nombre y numero.' });
    }

    try {
        // Verificar si ya existe el mismo número para el mismo cliente
        const existente = await clientes_numeros.findOne({ where: { cliente_id, numero } });
        if (existente) {
            return res.status(400).json({ message: 'El número de cliente ya está registrado para este cliente.' });
        }

        // Crear registro
        const nuevoRegistro = await clientes_numeros.create({
            cliente_id,
            nombre,
            numero,
            descripcion
        });

        res.status(201).json({
            message: 'Registro exitoso',
            clienteNumero: nuevoRegistro
        });

    } catch (error) {
        console.error('Error en el registro del número de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los números de clientes activos
clientesNumerosCtl.getClientesNumeros = async (req, res) => {
    try {
        const registros = await clientes_numeros.findAll({
            where: { estado: 'activo' },
            order: [['id', 'ASC']]
        });
        res.status(200).json(registros);
    } catch (error) {
        console.error('Error al obtener los números de clientes:', error.message);
        res.status(500).json({ error: 'Error al obtener los números de clientes' });
    }
};

// Obtener un número de cliente por ID
clientesNumerosCtl.getClientesNumeroById = async (req, res) => {
    try {
        const registro = await clientes_numeros.findByPk(req.params.id);
        if (registro && registro.estado === 'activo') {
            res.status(200).json(registro);
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
    const { nombre, numero, descripcion } = req.body;

    if (!nombre || !numero) {
        return res.status(400).json({ message: 'Los campos nombre y numero son requeridos.' });
    }

    try {
        const registro = await clientes_numeros.findByPk(req.params.id);
        if (registro && registro.estado === 'activo') {
            await registro.update({ nombre, numero, descripcion });
            res.status(200).json({
                message: 'Registro actualizado correctamente',
                clienteNumero: registro
            });
        } else {
            res.status(404).json({ error: 'Número de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el número de cliente:', error.message);
        res.status(500).json({ error: 'Error al actualizar el número de cliente' });
    }
};

// Eliminar (lógicamente) un número de cliente por ID
clientesNumerosCtl.deleteClientesNumero = async (req, res) => {
    try {
        const registro = await clientes_numeros.findByPk(req.params.id);
        if (registro && registro.estado === 'activo') {
            await registro.update({ estado: 'eliminado' });
            res.status(200).json({ message: 'Número de cliente eliminado correctamente' });
        } else {
            res.status(404).json({ error: 'Número de cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el número de cliente:', error.message);
        res.status(500).json({ error: 'Error al borrar el número de cliente' });
    }
};

module.exports = clientesNumerosCtl;
