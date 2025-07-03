const { clientes_numeros } = require('../Database/dataBase.orm'); // Asegúrate de que la ruta sea correcta
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

const clientesNumerosCtl = {};

// Crear un nuevo número de cliente
clientesNumerosCtl.crearClientesNumero = async (req, res) => {
    let { cliente_id, nombre, numero, descripcion } = req.body;

    // Validar campos requeridos
    if (!cliente_id || !nombre || !numero) {
        return res.status(400).json({ message: 'Faltan campos requeridos: cliente_id, nombre y numero.' });
    }

    try {
        // Cifrar campos sensibles SIEMPRE antes de cualquier operación
        const nombreCif = cifrarDato(nombre);
        const numeroCif = cifrarDato(numero);
        const descripcionCif = descripcion ? cifrarDato(descripcion) : null;

        // Verificar si ya existe el mismo número para el mismo cliente (comparando cifrado)
        const existente = await clientes_numeros.findOne({ where: { cliente_id, numero: numeroCif } });
        if (existente) {
            return res.status(400).json({ message: 'El número de cliente ya está registrado para este cliente.' });
        }

        // Crear registro SIEMPRE cifrado
        const nuevoRegistro = await clientes_numeros.create({
            cliente_id,
            nombre: nombreCif,
            numero: numeroCif,
            descripcion: descripcionCif
        });

        res.status(201).json({
            message: 'Registro exitoso',
            clienteNumero: {
                ...nuevoRegistro.toJSON(),
                nombre: descifrarDato(nuevoRegistro.nombre),
                numero: descifrarDato(nuevoRegistro.numero),
                descripcion: nuevoRegistro.descripcion ? descifrarDato(nuevoRegistro.descripcion) : null
            }
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
        // Descifrar los campos antes de enviar
        const registrosDescifrados = registros.map(r => ({
            ...r.toJSON(),
            nombre: descifrarDato(r.nombre),
            numero: descifrarDato(r.numero),
            descripcion: r.descripcion ? descifrarDato(r.descripcion) : null
        }));
        res.status(200).json(registrosDescifrados);
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
            res.status(200).json({
                ...registro.toJSON(),
                nombre: descifrarDato(registro.nombre),
                numero: descifrarDato(registro.numero),
                descripcion: registro.descripcion ? descifrarDato(registro.descripcion) : null
            });
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
    let { nombre, numero, descripcion } = req.body;

    if (!nombre || !numero) {
        return res.status(400).json({ message: 'Los campos nombre y numero son requeridos.' });
    }

    try {
        const registro = await clientes_numeros.findByPk(req.params.id);
        if (registro && registro.estado === 'activo') {
            // Cifrar campos antes de actualizar
            nombre = cifrarDato(nombre);
            numero = cifrarDato(numero);
            descripcion = descripcion ? cifrarDato(descripcion) : null;
            await registro.update({ nombre, numero, descripcion });
            res.status(200).json({
                message: 'Registro actualizado correctamente',
                clienteNumero: {
                    ...registro.toJSON(),
                    nombre: descifrarDato(registro.nombre),
                    numero: descifrarDato(registro.numero),
                    descripcion: registro.descripcion ? descifrarDato(registro.descripcion) : null
                }
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

// Obtener todos los números activos de un cliente específico
clientesNumerosCtl.getNumerosByClienteId = async (req, res) => {
    const { cliente_id } = req.params;
    try {
        const numeros = await clientes_numeros.findAll({
            where: { cliente_id, estado: 'activo' },
            order: [['id', 'ASC']]
        });
        // Descifrar los campos antes de enviar
        const numerosDescifrados = numeros.map(n => ({
            ...n.toJSON(),
            nombre: descifrarDato(n.nombre),
            numero: descifrarDato(n.numero),
            descripcion: n.descripcion ? descifrarDato(n.descripcion) : null
        }));
        res.status(200).json(numerosDescifrados);
    } catch (error) {
        console.error('Error al obtener los números del cliente:', error.message);
        res.status(500).json({ error: 'Error al obtener los números del cliente' });
    }
};

module.exports = clientesNumerosCtl;
