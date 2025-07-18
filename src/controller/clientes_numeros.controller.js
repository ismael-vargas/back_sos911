// Importa los modelos de ambas bases de datos (ORM y SQL directo) y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (ORM) - Necesario para la relación y el modelo
const sql = require('../Database/dataBase.sql'); // MySQL directo
const { cifrarDato, descifrarDato } = require('../lib/encrypDates'); // Utilidades de cifrado/descifrado

const clientesNumerosCtl = {};

// --- Utilidad para Descifrado Seguro ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos de clientes_numeros:', error.message);
        return '';
    }
}

// --- Utilidad para obtener el logger desde req.app ---
function getLogger(req) {
    return req.app && req.app.get ? req.app.get('logger') : console;
}

// 1. CREAR UN NUEVO NÚMERO DE CLIENTE (POST /clientes_numeros/crear)
clientesNumerosCtl.createClientNumber = async (req, res) => {
    const logger = getLogger(req);
    // Usamos 'clienteId' para que coincida con la columna de la DB (camelCase generada por Sequelize)
    let { nombre, numero, clienteId } = req.body; 
    logger.info(`[CLIENTES_NUMEROS] Intento de registro: nombre=${nombre}, numero=${numero}, clienteId=${clienteId}`);

    // Validar que los campos obligatorios estén presentes
    if (!nombre || !numero || !clienteId) { 
        logger.warn('[CLIENTES_NUMEROS] Registro fallido: campos obligatorios faltantes');
        return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, numero y clienteId.' });
    }

    try {
        // Cifrar los campos sensibles antes de guardar
        const nombreCif = cifrarDato(nombre);
        const numeroCif = cifrarDato(numero);

        // Verificar si ya existe el mismo número cifrado para el mismo cliente (usando SQL directo)
        const [existingNumSQL] = await sql.promise().query(
            "SELECT id FROM clientes_numeros WHERE clienteId = ? AND numero = ?", 
            [clienteId, numeroCif]
        );
        if (existingNumSQL.length > 0) {
            logger.warn(`[CLIENTES_NUMEROS] El número "${numero}" ya está registrado para el clienteId ${clienteId}.`);
            return res.status(409).json({ message: 'El número de cliente ya está registrado para este cliente.' });
        }

        // Crear registro usando SQL directo
        const [resultadoSQL] = await sql.promise().query(
            "INSERT INTO clientes_numeros (clienteId, nombre, numero, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [clienteId, nombreCif, numeroCif, 'activo']
        );
        const newClientNumberId = resultadoSQL.insertId;
        logger.info(`[CLIENTES_NUMEROS] Registro exitoso con ID: ${newClientNumberId}, clienteId=${clienteId}`);

        // Obtener el registro recién creado para la respuesta
        const [createdClientNumberSQL] = await sql.promise().query("SELECT * FROM clientes_numeros WHERE id = ?", [newClientNumberId]);
        const createdClientNumber = createdClientNumberSQL[0];

        res.status(201).json({
            message: 'Registro exitoso',
            clienteNumero: {
                id: createdClientNumber.id,
                clienteId: createdClientNumber.clienteId,
                nombre: safeDecrypt(createdClientNumber.nombre),
                numero: safeDecrypt(createdClientNumber.numero),
                estado: createdClientNumber.estado,
                fecha_creacion: createdClientNumber.fecha_creacion,
                fecha_modificacion: createdClientNumber.fecha_modificacion
            }
        });
    } catch (error) {
        console.error('Error al crear el número de cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear el número de cliente.' });
    }
};

// 2. OBTENER TODOS LOS NÚMEROS DE CLIENTE (GET /clientes_numeros/listar)
clientesNumerosCtl.getAllClientNumbers = async (req, res) => {
    const logger = getLogger(req);
    logger.info('[CLIENTES_NUMEROS] Solicitud de listado de clientes_numeros.');
    try {
        // Usar SQL directo para obtener clientes_numeros y unirse con clientes
        const [clientesNumerosSQL] = await sql.promise().query(
            `SELECT 
                cn.id, 
                cn.clienteId, 
                cn.nombre, 
                cn.numero, 
                cn.estado, 
                cn.fecha_creacion, 
                cn.fecha_modificacion,
                c.nombre AS cliente_nombre,
                c.correo_electronico AS cliente_correo
            FROM 
                clientes_numeros cn
            JOIN 
                clientes c ON cn.clienteId = c.id
            WHERE 
                cn.estado = 'activo'
            ORDER BY 
                cn.fecha_creacion DESC`
        );
        
        // Descifrar los campos sensibles antes de enviar
        const clientesNumerosCompletos = clientesNumerosSQL.map(numSQL => ({
            id: numSQL.id,
            clienteId: numSQL.clienteId,
            nombre: safeDecrypt(numSQL.nombre),
            numero: safeDecrypt(numSQL.numero),
            estado: numSQL.estado,
            fecha_creacion: numSQL.fecha_creacion,
            fecha_modificacion: numSQL.fecha_modificacion,
            cliente_info: {
                nombre: safeDecrypt(numSQL.cliente_nombre),
                correo_electronico: safeDecrypt(numSQL.cliente_correo)
            }
        }));

        logger.info(`[CLIENTES_NUMEROS] Se devolvieron ${clientesNumerosCompletos.length} números de cliente.`);
        res.status(200).json(clientesNumerosCompletos);
    } catch (error) {
        console.error('Error al obtener los números de clientes:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener los números de clientes.' });
    }
};

// 3. OBTENER UN NÚMERO DE CLIENTE POR ID (GET /clientes_numeros/detalle/:id)
clientesNumerosCtl.getClientNumberById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[CLIENTES_NUMEROS] Solicitud de número de cliente por ID: ${id}`);
    try {
        // Usar SQL directo para obtener el número de cliente por ID
        const [clientNumberSQL] = await sql.promise().query("SELECT * FROM clientes_numeros WHERE id = ? AND estado = 'activo'", [id]);

        if (clientNumberSQL.length === 0) {
            logger.warn(`[CLIENTES_NUMEROS] Número de cliente no encontrado o inactivo con ID: ${id}`);
            return res.status(404).json({ error: 'Número de cliente no encontrado o inactivo.' });
        }
        
        const clientNumber = clientNumberSQL[0];
        logger.info(`[CLIENTES_NUMEROS] Número de cliente encontrado con ID: ${id}.`);

        res.status(200).json({
            id: clientNumber.id,
            clienteId: clientNumber.clienteId,
            nombre: safeDecrypt(clientNumber.nombre),
            numero: safeDecrypt(clientNumber.numero),
            estado: clientNumber.estado,
            fecha_creacion: clientNumber.fecha_creacion,
            fecha_modificacion: clientNumber.fecha_modificacion
        });
    } catch (error) {
        console.error('Error al obtener el número de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener el número de cliente.' });
    }
};

// 4. ACTUALIZAR UN NÚMERO DE CLIENTE POR ID (PUT /clientes_numeros/actualizar/:id)
clientesNumerosCtl.updateClientNumber = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { nombre, numero, estado } = req.body; // No se permite cambiar clienteId en update
    logger.info(`[CLIENTES_NUMEROS] Solicitud de actualización de número de cliente con ID: ${id}`);

    try {
        // Verificar existencia y estado actual
        const [existingNumSQL] = await sql.promise().query("SELECT * FROM clientes_numeros WHERE id = ? AND estado = 'activo'", [id]);
        if (existingNumSQL.length === 0) {
            logger.warn(`[CLIENTES_NUMEROS] Número de cliente no encontrado o inactivo para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Número de cliente no encontrado o inactivo.' });
        }
        const numExistente = existingNumSQL[0];

        // Preparar campos y valores para la actualización SQL
        const camposSQL = [];
        const valoresSQL = [];

        if (nombre !== undefined) {
            camposSQL.push('nombre = ?');
            valoresSQL.push(cifrarDato(nombre));
        }
        if (numero !== undefined) {
            camposSQL.push('numero = ?');
            valoresSQL.push(cifrarDato(numero));
        }
        if (estado !== undefined) {
            camposSQL.push('estado = ?');
            valoresSQL.push(estado);
        }

        if (camposSQL.length === 0) {
            logger.warn(`[CLIENTES_NUMEROS] No se proporcionaron campos para actualizar el número de cliente con ID: ${id}.`);
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        valoresSQL.push(id); // Añadir el ID para la cláusula WHERE
        const consultaSQL = `UPDATE clientes_numeros SET ${camposSQL.join(', ')}, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?`;
        const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, valoresSQL);

        if (resultadoSQLUpdate.affectedRows === 0) {
            logger.warn(`[CLIENTES_NUMEROS] No se pudo actualizar el número de cliente SQL con ID: ${id}.`);
        } else {
            logger.info(`[CLIENTES_NUMEROS] Número de cliente SQL actualizado con ID: ${id}`);
        }

        // Obtener el registro actualizado para la respuesta
        const [updatedNumSQL] = await sql.promise().query("SELECT * FROM clientes_numeros WHERE id = ?", [id]);
        const numActualizado = updatedNumSQL[0];

        res.status(200).json({
            message: 'Número de cliente actualizado correctamente.',
            clienteNumero: {
                id: numActualizado.id,
                clienteId: numActualizado.clienteId,
                nombre: safeDecrypt(numActualizado.nombre),
                numero: safeDecrypt(numActualizado.numero),
                estado: numActualizado.estado,
                fecha_creacion: numActualizado.fecha_creacion,
                fecha_modificacion: numActualizado.fecha_modificacion
            }
        });
    } catch (error) {
        console.error('Error al actualizar el número de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el número de cliente.' });
    }
};

// 5. ELIMINAR UN NÚMERO DE CLIENTE (Borrado Lógico) (DELETE /clientes_numeros/eliminar/:id)
clientesNumerosCtl.deleteClientNumber = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[CLIENTES_NUMEROS] Solicitud de eliminación lógica de número de cliente con ID: ${id}`);
    try {
        // Verificar existencia y estado
        const [existingNumSQL] = await sql.promise().query("SELECT id FROM clientes_numeros WHERE id = ? AND estado = 'activo'", [id]);
        if (existingNumSQL.length === 0) {
            logger.warn(`[CLIENTES_NUMEROS] Número de cliente no encontrado o ya eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Número de cliente no encontrado o ya estaba eliminado.' });
        }

        // Marcar como eliminado en SQL directo
        const [resultadoSQL] = await sql.promise().query("UPDATE clientes_numeros SET estado = 'eliminado', fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?", [id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.error(`[CLIENTES_NUMEROS] No se pudo marcar como eliminado el número de cliente con ID: ${id}.`);
            return res.status(500).json({ error: 'No se pudo eliminar el número de cliente.' });
        }

        logger.info(`[CLIENTES_NUMEROS] Número de cliente marcado como eliminado: id=${id}`);
        res.status(200).json({ message: 'Número de cliente marcado como eliminado correctamente.' });
    } catch (error) {
        console.error('Error al borrar el número de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al borrar el número de cliente.' });
    }
};

// 6. Obtener todos los números activos de un cliente específico (GET /clientes_numeros/cliente/:clienteId)
clientesNumerosCtl.getNumbersByClientId = async (req, res) => {
    const logger = getLogger(req);
    const { clienteId } = req.params; // Usamos clienteId para el parámetro de ruta
    logger.info(`[CLIENTES_NUMEROS] Solicitud de números para clienteId: ${clienteId}`);

    try {
        // Usar SQL directo para obtener números por clienteId
        const [numerosSQL] = await sql.promise().query(
            "SELECT * FROM clientes_numeros WHERE clienteId = ? AND estado = 'activo' ORDER BY id ASC", 
            [clienteId]
        );
        
        // Descifrar los campos antes de enviar
        const numerosDescifrados = numerosSQL.map(n => ({
            id: n.id,
            clienteId: n.clienteId,
            nombre: safeDecrypt(n.nombre),
            numero: safeDecrypt(n.numero),
            estado: n.estado,
            fecha_creacion: n.fecha_creacion,
            fecha_modificacion: n.fecha_modificacion
        }));

        logger.info(`[CLIENTES_NUMEROS] Se devolvieron ${numerosDescifrados.length} números para clienteId: ${clienteId}.`);
        res.status(200).json(numerosDescifrados);
    } catch (error) {
        console.error('Error al obtener los números del cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener los números del cliente.' });
    }
};

module.exports = clientesNumerosCtl;
