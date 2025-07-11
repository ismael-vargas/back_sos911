const { contactos_emergencia } = require('../Database/dataBase.orm'); // Ajusta la ruta según tu estructura
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

const contactosEmergenciasCtl = {};

// Crear un nuevo contacto de emergencia
contactosEmergenciasCtl.createContactoEmergencia = async (req, res) => {
    const { cliente_id, nombre, relacion, numero, telefono, descripcion, estado } = req.body;
    console.log('Intento de crear contacto de emergencia:', { cliente_id, nombre, telefono: numero || telefono, descripcion: relacion || descripcion });

    try {
        console.log(`[CONTACTOS_EMERGENCIA] Intento de creación de contacto: cliente_id=${cliente_id}, nombre=${nombre}`);
        
        // Usar numero si existe, sino usar telefono para compatibilidad
        const phone = numero || telefono;
        
        // Cifrar los datos sensibles
        const nombreCifrado = cifrarDato(nombre);
        const telefonoCifrado = cifrarDato(phone);
        const descripcionCifrada = cifrarDato(relacion || descripcion);
        
        const contactoExistente = await contactos_emergencia.findOne({ 
            where: { 
                cliente_id, 
                nombre: nombreCifrado,
                estado: 'activo'
            } 
        });
        
        if (contactoExistente) {
            console.log(`[CONTACTOS_EMERGENCIA] Error: Contacto duplicado para cliente_id=${cliente_id}, nombre=${nombre}`);
            return res.status(400).json({ message: 'El contacto de emergencia ya está registrado.' });
        }

        const nuevoContacto = await contactos_emergencia.create({
            cliente_id,
            nombre: nombreCifrado,
            descripcion: descripcionCifrada,
            telefono: telefonoCifrado,
            estado: estado || 'activo'
        });

        console.log(`[CONTACTOS_EMERGENCIA] Contacto creado exitosamente: id=${nuevoContacto.id}, cliente_id=${cliente_id}, nombre=${nombre}`);

        // Responder con los datos descifrados
        const respuesta = {
            ...nuevoContacto.toJSON(),
            nombre: descifrarDato(nuevoContacto.nombre),
            telefono: descifrarDato(nuevoContacto.telefono),
            descripcion: descifrarDato(nuevoContacto.descripcion)
        };

        res.status(201).json(respuesta);
    } catch (error) {
        console.error(`[CONTACTOS_EMERGENCIA] Error al crear contacto: cliente_id=${cliente_id}, error=${error.message}`);
        res.status(500).json({ error: 'Error al crear el contacto de emergencia' });
    }
};

// Obtener todos los contactos de emergencia activos
contactosEmergenciasCtl.getContactosEmergencias = async (req, res) => {
    try {
        console.log(`[CONTACTOS_EMERGENCIA] Obteniendo todos los contactos de emergencia activos`);
        
        const contactos = await contactos_emergencia.findAll({
            where: { estado: 'activo' }
        });
        
        console.log(`[CONTACTOS_EMERGENCIA] Se encontraron ${contactos.length} contactos activos`);
        
        // Descifrar los datos antes de enviarlos
        const contactosDescifrados = contactos.map(contacto => {
            const contactoData = contacto.toJSON();
            try {
                contactoData.nombre = descifrarDato(contactoData.nombre);
                contactoData.telefono = descifrarDato(contactoData.telefono);
                contactoData.descripcion = descifrarDato(contactoData.descripcion);
            } catch (error) {
                console.error('Error al descifrar datos del contacto:', error);
            }
            return contactoData;
        });
        
        res.status(200).json(contactosDescifrados);
    } catch (error) {
        console.error(`[CONTACTOS_EMERGENCIA] Error al obtener contactos: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los contactos de emergencia' });
    }
};

// Obtener contactos de emergencia por cliente
contactosEmergenciasCtl.getContactosByCliente = async (req, res) => {
    try {
        const { cliente_id } = req.params;
        console.log(`[CONTACTOS_EMERGENCIA] Obteniendo contactos por cliente_id=${cliente_id}`);
        
        const contactos = await contactos_emergencia.findAll({
            where: { 
                cliente_id: cliente_id,
                estado: 'activo' 
            }
        });
        
        console.log(`[CONTACTOS_EMERGENCIA] Se encontraron ${contactos.length} contactos para cliente_id=${cliente_id}`);
        
        // Descifrar los datos antes de enviarlos
        const contactosDescifrados = contactos.map(contacto => {
            const contactoData = contacto.toJSON();
            try {
                contactoData.nombre = descifrarDato(contactoData.nombre);
                contactoData.telefono = descifrarDato(contactoData.telefono);
                contactoData.descripcion = descifrarDato(contactoData.descripcion);
            } catch (error) {
                console.error('Error al descifrar datos del contacto:', error);
            }
            return contactoData;
        });
        
        res.status(200).json(contactosDescifrados);
    } catch (error) {
        console.error(`[CONTACTOS_EMERGENCIA] Error al obtener contactos por cliente_id=${cliente_id}: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los contactos de emergencia' });
    }
};

        // Obtener un contacto de emergencia por ID
contactosEmergenciasCtl.getContactoEmergenciaById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[CONTACTOS_EMERGENCIA] Obteniendo contacto por id=${id}`);
        
        const contacto = await contactos_emergencia.findByPk(id);
        if (contacto) {
            console.log(`[CONTACTOS_EMERGENCIA] Contacto encontrado: id=${id}`);
            
            // Descifrar los datos antes de enviarlos
            const contactoData = contacto.toJSON();
            try {
                contactoData.nombre = descifrarDato(contactoData.nombre);
                contactoData.telefono = descifrarDato(contactoData.telefono);
                contactoData.descripcion = descifrarDato(contactoData.descripcion);
            } catch (error) {
                console.error('Error al descifrar datos del contacto:', error);
            }
            res.status(200).json(contactoData);
        } else {
            console.log(`[CONTACTOS_EMERGENCIA] Error: Contacto no encontrado para id=${id}`);
            res.status(404).json({ error: 'Contacto de emergencia no encontrado' });
        }
    } catch (error) {
        console.error(`[CONTACTOS_EMERGENCIA] Error al obtener contacto por id=${req.params.id}: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener el contacto de emergencia' });
    }
};

// Actualizar un contacto de emergencia por ID
contactosEmergenciasCtl.updateContactoEmergencia = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[CONTACTOS_EMERGENCIA] Intento de actualizar contacto id=${id}`, req.body);
        
        const contacto = await contactos_emergencia.findByPk(id);
        if (contacto) {
            // Preparar los datos para cifrar
            const updateData = {};
            if (req.body.nombre) updateData.nombre = cifrarDato(req.body.nombre);
            if (req.body.telefono || req.body.numero) updateData.telefono = cifrarDato(req.body.telefono || req.body.numero);
            if (req.body.descripcion || req.body.relacion) updateData.descripcion = cifrarDato(req.body.descripcion || req.body.relacion);
            if (req.body.estado) updateData.estado = req.body.estado;
            
            await contacto.update(updateData);
            
            console.log(`[CONTACTOS_EMERGENCIA] Contacto actualizado exitosamente: id=${id}`);
            
            // Devolver los datos descifrados
            const contactoData = contacto.toJSON();
            try {
                contactoData.nombre = descifrarDato(contactoData.nombre);
                contactoData.telefono = descifrarDato(contactoData.telefono);
                contactoData.descripcion = descifrarDato(contactoData.descripcion);
            } catch (error) {
                console.error('Error al descifrar datos del contacto:', error);
            }
            
            res.status(200).json(contactoData);
        } else {
            console.log(`[CONTACTOS_EMERGENCIA] Error: Contacto no encontrado para actualizar id=${id}`);
            res.status(404).json({ error: 'Contacto de emergencia no encontrado' });
        }
    } catch (error) {
        console.error(`[CONTACTOS_EMERGENCIA] Error al actualizar contacto id=${req.params.id}: ${error.message}`);
        res.status(500).json({ error: 'Error al actualizar el contacto de emergencia' });
    }
};

// Borrar un contacto de emergencia por ID (actualización de estado)
contactosEmergenciasCtl.deleteContactoEmergencia = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[CONTACTOS_EMERGENCIA] Intento de eliminar contacto id=${id}`);
        
        const contacto = await contactos_emergencia.findByPk(id);
        if (contacto) {
            await contacto.update({ estado: 'eliminado' });
            console.log(`[CONTACTOS_EMERGENCIA] Contacto eliminado exitosamente: id=${id}`);
            res.status(200).json({ message: 'Contacto de emergencia marcado como eliminado' });
        } else {
            console.log(`[CONTACTOS_EMERGENCIA] Error: Contacto no encontrado para eliminar id=${id}`);
            res.status(404).json({ error: 'Contacto de emergencia no encontrado' });
        }
    } catch (error) {
        console.error(`[CONTACTOS_EMERGENCIA] Error al eliminar contacto id=${req.params.id}: ${error.message}`);
        res.status(500).json({ error: 'Error al borrar el contacto de emergencia' });
    }
};

module.exports = contactosEmergenciasCtl;
// cambios realizados