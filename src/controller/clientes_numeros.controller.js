// Importa los modelos de ambas bases de datos (ORM y SQL directo) y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL) - Necesario para la relación y el modelo
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

// Función para formatear una fecha a 'YYYY-MM-DD HH:mm:ss'
function formatLocalDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-index
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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

        // Verificar si el clienteId existe y está activo
        const [existingClient] = await sql.promise().query("SELECT id FROM clientes WHERE id = ? AND estado = 'activo'", [clienteId]);
        if (existingClient.length === 0) {
            logger.warn(`[CLIENTES_NUMEROS] Creación fallida: cliente no existe o está inactivo (clienteId=${clienteId})`);
            return res.status(400).json({ message: 'El cliente asociado no existe o no está activo.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Verificar si ya existe el mismo número cifrado para el mismo cliente (usando SQL directo)
        const [existingNumSQL] = await sql.promise().query(
            "SELECT id FROM clientes_numeros WHERE clienteId = ? AND numero = ?", 
            [clienteId, numeroCif]
        );
        if (existingNumSQL.length > 0) {
            logger.warn(`[CLIENTES_NUMEROS] El número "${numero}" ya está registrado para el clienteId ${clienteId}.`);
            return res.status(409).json({ message: 'El número de cliente ya está registrado para este cliente.' });
        }

        // Crear registro usando ORM (como usuario.controller.js)
        const nuevoNumeroCliente = await orm.clientes_numeros.create({
            clienteId: clienteId,
            nombre: nombreCif,
            numero: numeroCif,
            estado: 'activo',
            fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
        });
        const newClientNumberId = nuevoNumeroCliente.id; // Obtener el ID insertado por ORM
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
                fecha_modificacion: createdClientNumber.fecha_modificacion // Puede ser null si no se ha modificado
            }
        });
    } catch (error) {
        logger.error('Error al crear el número de cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear el número de cliente.' });
    }
};

// 2. OBTENER TODOS LOS NÚMEROS DE CLIENTE (GET /clientes_numeros/listar)
clientesNumerosCtl.getAllClientNumbers = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Añadido para consistencia
    logger.info(`[CLIENTES_NUMEROS] Solicitud de listado de clientes_numeros (incluirEliminados: ${incluirEliminados}).`);
    try {
        let querySQL = `SELECT 
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
                            clientes c ON cn.clienteId = c.id`;
        
        const params = [];
        if (!incluirEliminados) {
            querySQL += ` WHERE cn.estado = 'activo'`;
        }
        querySQL += ` ORDER BY cn.fecha_creacion DESC`; // Ordenar para consistencia

        const [clientesNumerosSQL] = await sql.promise().query(querySQL, params);
        
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
        logger.error('Error al obtener los números de clientes:', error.message);
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
        logger.error('Error al obtener el número de cliente:', error.message);
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

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Preparar campos y valores para la actualización SQL
        const campos = [];
        const valores = [];

        if (nombre !== undefined) {
            campos.push('nombre = ?');
            valores.push(cifrarDato(nombre));
        }
        if (numero !== undefined) {
            campos.push('numero = ?');
            valores.push(cifrarDato(numero));
        }
        if (estado !== undefined) {
            campos.push('estado = ?');
            valores.push(estado);
        }

        if (campos.length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        // Siempre actualizar fecha_modificacion en SQL
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        valores.push(id); // Añadir el ID para la cláusula WHERE
        const consultaSQL = `UPDATE clientes_numeros SET ${campos.join(', ')} WHERE id = ?`;
        const [resultado] = await sql.promise().query(consultaSQL, valores);

        if (resultado.affectedRows === 0) {
            logger.warn(`[CLIENTES_NUMEROS] No se pudo actualizar el número de cliente SQL con ID: ${id}.`);
        } else {
            logger.info(`[CLIENTES_NUMEROS] Número de cliente SQL actualizado con ID: ${id}`);
        }

        // Obtener el registro actualizado para la respuesta
        const [updatedNum] = await sql.promise().query("SELECT * FROM clientes_numeros WHERE id = ?", [id]);
        const numActualizado = updatedNum[0];

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
        logger.error('Error al actualizar el número de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el número de cliente.' });
    }
};

// 5. ELIMINAR UN NÚMERO DE CLIENTE (Borrado Lógico) (DELETE /clientes_numeros/eliminar/:id)
clientesNumerosCtl.deleteClientNumber = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[CLIENTES_NUMEROS] Eliminación de usuario_numero: id=${id}`);
    try {
        // Verificar existencia y estado
        const [existingNumSQL] = await sql.promise().query("SELECT id FROM clientes_numeros WHERE id = ? AND estado = 'activo'", [id]); // Solo eliminar si está activo
        if (existingNumSQL.length === 0 || existingNumSQL[0].estado === 'eliminado') {
            logger.warn(`[CLIENTES_NUMEROS] Número de cliente no encontrado o ya eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Número de cliente no encontrado o ya eliminado.' });
        }

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Marcar como eliminado en SQL directo
        const [resultado] = await sql.promise().query("UPDATE clientes_numeros SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [formattedNow, id]);
        
        if (resultado.affectedRows === 0) {
            logger.error(`[CLIENTES_NUMEROS] No se pudo marcar como eliminado el usuario_numero: id=${id}`);
            return res.status(500).json({ error: 'No se pudo eliminar el número de cliente.' });
        }

        logger.info(`[CLIENTES_NUMEROS] Número de cliente marcado como eliminado: id=${id}`);
        res.status(200).json({ message: 'Número de cliente marcado como eliminado correctamente.' });
    } catch (error) {
        logger.error('Error al borrar el número de cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al borrar el número de cliente.' });
    }
};

// 6. Obtener todos los números activos de un cliente específico (GET /clientes_numeros/cliente/:clienteId)
clientesNumerosCtl.getNumbersByClientId = async (req, res) => {
    const logger = getLogger(req);
    const clienteId = req.params.cliente_id; // <-- Cambia aquí
    logger.info(`[CLIENTES_NUMEROS] Solicitud de números para clienteId: ${clienteId}`);

    try {
        const [numerosSQL] = await sql.promise().query(
            "SELECT * FROM clientes_numeros WHERE clienteId = ? AND estado = 'activo' ORDER BY fecha_creacion DESC",
            [clienteId]
        );
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
        logger.error('Error al obtener los números del cliente:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al obtener los números del cliente.' });
    }
};

module.exports = clientesNumerosCtl;
