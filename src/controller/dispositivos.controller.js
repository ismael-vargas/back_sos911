const { dispositivos } = require('../Database/dataBase.orm'); // Ajusta la ruta según tu estructura de carpetas
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

const dispositivosCtl = {};

// Crear un nuevo dispositivo
dispositivosCtl.createDispositivo = async (req, res) => {
    const { cliente_id, token_dispositivo, tipo_dispositivo, modelo_dispositivo, estado } = req.body;

    try {
        // Cifrar los campos sensibles
        const tokenCifrado = cifrarDato(token_dispositivo);
        const tipoCifrado = cifrarDato(tipo_dispositivo);
        const modeloCifrado = cifrarDato(modelo_dispositivo);

        // Verificar si el dispositivo ya existe para ese cliente y token cifrado
        const existingDispositivo = await dispositivos.findOne({ where: { cliente_id, token_dispositivo: tokenCifrado } });
        if (existingDispositivo) {
            return res.status(400).json({ message: 'El dispositivo ya está registrado.' });
        }

        // Si no existe, crear un nuevo dispositivo (cifrando los campos)
        const nuevoDispositivo = await dispositivos.create({
            cliente_id,
            token_dispositivo: tokenCifrado,
            tipo_dispositivo: tipoCifrado,
            modelo_dispositivo: modeloCifrado,
            estado: estado || 'activo' // Valor por defecto si no se proporciona
        });
        // Devuelve los campos descifrados en la respuesta
        const respuesta = {
            ...nuevoDispositivo.toJSON(),
            token_dispositivo,
            tipo_dispositivo,
            modelo_dispositivo
        };
        res.status(201).json(respuesta);
    } catch (error) {
        console.error('Error al crear el dispositivo:', error.message);
        res.status(500).json({ error: 'Error al crear el dispositivo' });
    }
};

// Obtener todos los dispositivos con información del cliente
dispositivosCtl.getDispositivos = async (req, res) => {
    try {
        const { cliente } = require('../Database/dataBase.orm');
        
        const dispositivosList = await dispositivos.findAll({
            include: [{
                model: cliente,
                attributes: ['id', 'nombre', 'correo_electronico', 'cedula_identidad']
            }],
            order: [['fecha_creacion', 'DESC']]
        });

        // Descifrar los datos antes de enviarlos
        const dispositivosDescifrados = dispositivosList.map(dispositivo => {
            const dispositivoData = dispositivo.toJSON();
            
            try {
                dispositivoData.token_dispositivo = descifrarDato(dispositivoData.token_dispositivo);
                dispositivoData.tipo_dispositivo = descifrarDato(dispositivoData.tipo_dispositivo);
                dispositivoData.modelo_dispositivo = descifrarDato(dispositivoData.modelo_dispositivo);
            } catch (error) {
                console.error('Error al descifrar datos del dispositivo:', error);
                // Mantener datos cifrados si hay error
            }
            
            return dispositivoData;
        });

        console.log('Dispositivos descifrados:', JSON.stringify(dispositivosDescifrados, null, 2));
        res.status(200).json(dispositivosDescifrados);
    } catch (error) {
        console.error('Error al obtener los dispositivos:', error.message);
        res.status(500).json({ error: 'Error al obtener los dispositivos' });
    }
};

// Obtener un dispositivo por ID
dispositivosCtl.getDispositivoById = async (req, res) => {
    try {
        const dispositivo = await dispositivos.findByPk(req.params.id);
        if (dispositivo) {
            res.status(200).json(dispositivo);
        } else {
            res.status(404).json({ error: 'Dispositivo no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el dispositivo:', error.message);
        res.status(500).json({ error: 'Error al obtener el dispositivo' });
    }
};

// Actualizar un dispositivo por ID
dispositivosCtl.updateDispositivo = async (req, res) => {
    try {
        const dispositivo = await dispositivos.findByPk(req.params.id);
        if (dispositivo) {
            await dispositivo.update(req.body);
            res.status(200).json(dispositivo);
        } else {
            res.status(404).json({ error: 'Dispositivo no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar el dispositivo:', error.message);
        res.status(500).json({ error: 'Error al actualizar el dispositivo' });
    }
};

// Borrar un dispositivo por ID (actualización de estado)
dispositivosCtl.deleteDispositivo = async (req, res) => {
    try {
        const dispositivo = await dispositivos.findByPk(req.params.id);
        if (dispositivo) {
            await dispositivo.update({ estado: 'eliminado' });
            res.status(200).json({ message: 'Dispositivo marcado como eliminado' });
        } else {
            res.status(404).json({ error: 'Dispositivo no encontrado' });
        }
    } catch (error) {
        console.error('Error al borrar el dispositivo:', error.message);
        res.status(500).json({ error: 'Error al borrar el dispositivo' });
    }
};

module.exports = dispositivosCtl;
