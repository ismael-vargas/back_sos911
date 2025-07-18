// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../Database/dataBase.sql'); // MySQL directo
const mongo = require('../Database/dataBase.mongo'); // Para Mongoose (MongoDB)

const { cifrarDato, descifrarDato } = require('../lib/encrypDates');
const bcrypt = require('bcryptjs'); // Usar bcryptjs para consistencia con usuario.controller.js
const CryptoJS = require('crypto-js'); // Para hashing de correo (aunque ya no se usará para DB)

const clientesCtl = {};

// --- Utilidad para Descifrado Seguro ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos:', error.message);
        return '';
    }
}

// Utilidad para obtener el logger (manteniendo lo que ya tenías)
function getLogger(req) {
  return req.app && req.app.get ? req.app.get('logger') : console;
}

// Función para hashear el correo (ya no se usará para la DB, pero se mantiene si es necesario para otros fines)
function hashCorreo(correo) {
    return CryptoJS.SHA256(correo).toString(CryptoJS.enc.Hex);
}

// --- CRUD de Clientes ---

// 1. CREAR CLIENTE
clientesCtl.createClient = async (req, res) => {
    const logger = getLogger(req);
    const { nombre, correo_electronico, cedula_identidad, contrasena, fecha_nacimiento, direccion, deviceId, tipo_dispositivo, modelo_dispositivo } = req.body;
    
    logger.info(`[CLIENTE] Solicitud de creación de cliente: correo=${correo_electronico}, nombre=${nombre}`);

    try {
        // Validar campos obligatorios
        if (!nombre || !correo_electronico || !cedula_identidad || !contrasena || !direccion) {
            logger.warn('[CLIENTE] Creación fallida: campos obligatorios faltantes.');
            return res.status(400).json({ message: 'Todos los campos obligatorios son requeridos (nombre, correo_electronico, cedula_identidad, contrasena, direccion).' });
        }

        // Cifrar datos sensibles y hashear contraseña
        const nombreCifrado = cifrarDato(nombre);
        const correoCifrado = cifrarDato(correo_electronico);
        const cedulaCifrada = cifrarDato(cedula_identidad);
        const contrasena_hash = await bcrypt.hash(contrasena, 10);

        // Verificar si el correo ya está registrado (descifrando y comparando)
        const [allClientesSQL] = await sql.promise().query("SELECT id, correo_electronico FROM clientes");
        const existingCliente = allClientesSQL.find(c => safeDecrypt(c.correo_electronico) === correo_electronico);

        if (existingCliente) {
            logger.warn(`[CLIENTE] Creación fallida: El correo electrónico "${correo_electronico}" ya está registrado.`);
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // Crear cliente en la base de datos SQL
        const [resultadoSQL] = await sql.promise().query(
            "INSERT INTO clientes (nombre, correo_electronico, cedula_identidad, contrasena_hash, numero_ayudas, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [nombreCifrado, correoCifrado, cedulaCifrada, contrasena_hash, 0, 'activo']
        );
        const idClienteSql = resultadoSQL.insertId; // Obtener el ID insertado
        logger.info(`[CLIENTE] Cliente SQL creado exitosamente con ID: ${idClienteSql}`);

        // Crear documento en la base de datos MongoDB
        const nuevoClienteMongo = { 
            idClienteSql, 
            fecha_nacimiento, 
            direccion: cifrarDato(direccion), // Cifrar dirección en Mongo
            estado: 'activo' // Estado por defecto
        };
        await mongo.Cliente.create(nuevoClienteMongo);
        logger.info(`[CLIENTE] Cliente Mongo creado exitosamente para ID SQL: ${idClienteSql}`);

        // Registrar dispositivo si se envía
        if (deviceId && tipo_dispositivo && modelo_dispositivo) {
            logger.info(`[DISPOSITIVO] Registrando dispositivo para nuevo cliente: ${idClienteSql}, deviceId=${deviceId}`);
            
            // Desactivar cualquier dispositivo existente con el mismo deviceId (sin importar el cliente_id)
            // Cambiado a 'clienteId' para coincidir con el nombre de columna de Sequelize
            const [todosDispositivosSQL] = await sql.promise().query("SELECT id, token_dispositivo, clienteId FROM dispositivos WHERE estado = 'activo'");
            for (const disp of todosDispositivosSQL) {
                try {
                    const deviceIdDescifrado = descifrarDato(disp.token_dispositivo);
                    if (deviceIdDescifrado === deviceId) {
                        await sql.promise().query("UPDATE dispositivos SET estado = 'inactivo' WHERE id = ?", [disp.id]);
                        // Cambiado a 'clienteId'
                        logger.info(`[DISPOSITIVO] Dispositivo previamente activo desactivado: clienteId=${disp.clienteId}, deviceId=${deviceId}`);
                    }
                } catch (error) {
                    logger.warn(`[DISPOSITIVO] Error al descifrar token en registro de dispositivo: ${error.message}`);
                }
            }

            // Crear el nuevo dispositivo para este cliente
            const tokenDispositivoCif = cifrarDato(deviceId);
            const tipoDispositivoCif = cifrarDato(tipo_dispositivo);
            const modeloDispositivoCif = cifrarDato(modelo_dispositivo);
            await sql.promise().query(
                // Cambiado a 'clienteId'
                "INSERT INTO dispositivos (clienteId, token_dispositivo, tipo_dispositivo, modelo_dispositivo, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                [idClienteSql, tokenDispositivoCif, tipoDispositivoCif, modeloDispositivoCif, 'activo']
            );
            logger.info(`[DISPOSITIVO] Dispositivo registrado exitosamente para cliente ${idClienteSql}.`);
        }

        res.status(201).json({ 
            message: 'Cliente registrado exitosamente.',
            clienteId: idClienteSql
        });

    } catch (error) {
        logger.error(`[CLIENTE] Error al crear el cliente: ${error.message}`, error);
        res.status(500).json({ error: 'Error interno del servidor al crear el cliente.' });
    }
};

// 2. OBTENER TODOS LOS CLIENTES (Usando SQL Directo)
clientesCtl.getAllClients = async (req, res) => {
    const logger = getLogger(req);
    const { incluirEliminados } = req.query; // Para manejar borrado lógico
    logger.info(`[CLIENTE] Solicitud de obtención de todos los clientes (incluirEliminados: ${incluirEliminados})`);

    try {
        // Se usa la conexión 'sql' para una consulta directa, como en usuario.controller.js
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE estado = 'activo'";
        const [clientesSQL] = await sql.promise().query(`SELECT * FROM clientes${estadoQuery}`);
        
        const clientesCompletos = await Promise.all(
            clientesSQL.map(async (clienteSQL) => {
                const clienteMongo = await mongo.Cliente.findOne({ idClienteSql: clienteSQL.id });
                return {
                    id: clienteSQL.id,
                    nombre: safeDecrypt(clienteSQL.nombre),
                    correo_electronico: safeDecrypt(clienteSQL.correo_electronico),
                    cedula_identidad: safeDecrypt(clienteSQL.cedula_identidad),
                    numero_ayudas: clienteSQL.numero_ayudas,
                    estado: clienteSQL.estado,
                    fecha_nacimiento: clienteMongo ? clienteMongo.fecha_nacimiento : null,
                    direccion: clienteMongo ? safeDecrypt(clienteMongo.direccion) : null, // Descifrar dirección de Mongo
                    fecha_creacion_sql: clienteSQL.fecha_creacion,
                    fecha_modificacion_sql: clienteSQL.fecha_modificacion,
                    fecha_creacion_mongo: clienteMongo?.fecha_creacion || null,
                    fecha_modificacion_mongo: clienteMongo?.fecha_modificacion || null,
                };
            })
        );
        logger.info(`[CLIENTE] Se devolvieron ${clientesCompletos.length} clientes.`);
        res.status(200).json(clientesCompletos);
    } catch (error) {
        console.error('Error al obtener todos los clientes:', error); // Usar console.error directamente
        res.status(500).json({ error: 'Error interno del servidor al obtener clientes.' });
    }
};

// 3. OBTENER CLIENTE POR ID (Usando SQL Directo)
clientesCtl.getClientById = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[CLIENTE] Solicitud de obtención de cliente por ID: ${id}`);

    try {
        // SQL directo para obtener cliente, como en usuario.controller.js
        const [clientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE id = ? AND estado = 'activo'", [id]);
        
        if (clientesSQL.length === 0) {
            logger.warn(`[CLIENTE] Cliente no encontrado o eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Cliente no encontrado o eliminado.' });
        }
        
        const clienteSQL = clientesSQL[0];
        logger.info(`[CLIENTE] Cliente SQL encontrado con ID: ${id}`);

        // Obtener documento de MongoDB
        const clienteMongo = await mongo.Cliente.findOne({ idClienteSql: id });
        logger.info(`[CLIENTE] Cliente Mongo encontrado para ID SQL: ${id}`);

        const clienteCompleto = {
            id: clienteSQL.id,
            nombre: safeDecrypt(clienteSQL.nombre),
            correo_electronico: safeDecrypt(clienteSQL.correo_electronico),
            cedula_identidad: safeDecrypt(clienteSQL.cedula_identidad),
            numero_ayudas: clienteSQL.numero_ayudas,
            estado: clienteSQL.estado,
            fecha_nacimiento: clienteMongo?.fecha_nacimiento || null,
            direccion: clienteMongo ? safeDecrypt(clienteMongo.direccion) : null, // Descifrar dirección de Mongo
            fecha_creacion_sql: clienteSQL.fecha_creacion,
            fecha_modificacion_sql: clienteSQL.fecha_modificacion,
            fecha_creacion_mongo: clienteMongo?.fecha_creacion || null,
            fecha_modificacion_mongo: clienteMongo?.fecha_modificacion || null,
        };
        res.status(200).json(clienteCompleto);
    } catch (error) {
        console.error('Error al obtener el cliente:', error); // Usar console.error directamente
        res.status(500).json({ error: 'Error interno del servidor al obtener el cliente.' });
    }
};

// 4. ACTUALIZAR CLIENTE (Usando SQL Directo)
clientesCtl.updateClient = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    const { nombre, correo_electronico, cedula_identidad, contrasena, fecha_nacimiento, direccion, estado, numero_ayudas } = req.body;
    logger.info(`[CLIENTE] Solicitud de actualización de cliente con ID: ${id}`);

    try {
        // Verificar si el cliente existe en SQL y está activo
        const [clientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE id = ? AND estado = 'activo'", [id]);
        if (clientesSQL.length === 0) {
            logger.warn(`[CLIENTE] Cliente no encontrado para actualizar con ID: ${id}`);
            return res.status(404).json({ error: 'Cliente no encontrado o eliminado para actualizar.' });
        }
        const clienteSQL = clientesSQL[0];

        // Preparar datos para SQL (solo los que no son undefined)
        const camposSQL = [];
        const valoresSQL = [];
        
        if (nombre !== undefined) {
            camposSQL.push('nombre = ?');
            valoresSQL.push(cifrarDato(nombre));
        }
        if (cedula_identidad !== undefined) {
            camposSQL.push('cedula_identidad = ?');
            valoresSQL.push(cifrarDato(cedula_identidad));
        }
        if (estado !== undefined) {
            camposSQL.push('estado = ?');
            valoresSQL.push(estado);
        }
        if (numero_ayudas !== undefined) {
            camposSQL.push('numero_ayudas = ?');
            valoresSQL.push(numero_ayudas);
        }
        if (contrasena !== undefined) {
            camposSQL.push('contrasena_hash = ?');
            valoresSQL.push(await bcrypt.hash(contrasena, 10));
        }
        
        // Si el correo se actualiza, verificar y actualizar el correo_electronico cifrado
        if (correo_electronico !== undefined) {
            // Verificar si el nuevo correo ya está en uso por otro cliente activo (descifrando y comparando)
            const [allOtherClientesSQL] = await sql.promise().query("SELECT id, correo_electronico FROM clientes WHERE id != ? AND estado = 'activo'", [id]);
            const existingClienteWithNewEmail = allOtherClientesSQL.find(c => safeDecrypt(c.correo_electronico) === correo_electronico);

            if (existingClienteWithNewEmail) {
                logger.warn(`[CLIENTE] Actualización fallida: El nuevo correo electrónico "${correo_electronico}" ya está registrado por otro cliente.`);
                return res.status(409).json({ message: 'El nuevo correo electrónico ya está registrado por otro cliente.' });
            }
            camposSQL.push('correo_electronico = ?');
            valoresSQL.push(cifrarDato(correo_electronico));
        }

        // Solo actualizar SQL si hay campos para actualizar
        if (camposSQL.length > 0) {
            valoresSQL.push(id); // Para el WHERE
            const consultaSQL = `UPDATE clientes SET ${camposSQL.join(', ')}, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?`;
            const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, valoresSQL);
            
            if (resultadoSQLUpdate.affectedRows === 0) {
                logger.warn(`[CLIENTE] No se pudo actualizar el cliente SQL con ID: ${id}.`);
            } else {
                logger.info(`[CLIENTE] Cliente SQL actualizado con ID: ${id}`);
            }
        }

        // Preparar datos para actualización en MongoDB
        const updateDataMongo = {};
        if (fecha_nacimiento !== undefined) updateDataMongo.fecha_nacimiento = fecha_nacimiento;
        if (direccion !== undefined) updateDataMongo.direccion = cifrarDato(direccion); // Cifrar dirección en Mongo
        // Replicar el estado si se actualiza en SQL
        if (estado !== undefined) updateDataMongo.estado = estado;

        // Realizar actualización en MongoDB
        if (Object.keys(updateDataMongo).length > 0) {
            await mongo.Cliente.updateOne({ idClienteSql: id }, { $set: updateDataMongo, $currentDate: { fecha_modificacion: true } });
            logger.info(`[CLIENTE] Cliente Mongo actualizado para ID SQL: ${id}`);
        }
        
        // Obtener el cliente actualizado para la respuesta (usando SQL directo y Mongo)
        const [updatedClientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE id = ?", [id]);
        const updatedClienteSQL = updatedClientesSQL[0];
        const updatedClienteMongo = await mongo.Cliente.findOne({ idClienteSql: id });

        res.status(200).json({ 
            message: 'Cliente actualizado correctamente.',
            cliente: {
                id: updatedClienteSQL.id,
                nombre: safeDecrypt(updatedClienteSQL.nombre),
                correo_electronico: safeDecrypt(updatedClienteSQL.correo_electronico),
                cedula_identidad: safeDecrypt(updatedClienteSQL.cedula_identidad),
                numero_ayudas: updatedClienteSQL.numero_ayudas,
                estado: updatedClienteSQL.estado,
                fecha_nacimiento: updatedClienteMongo?.fecha_nacimiento || null,
                direccion: updatedClienteMongo ? safeDecrypt(updatedClienteMongo.direccion) : null,
            }
        });

    } catch (error) {
        console.error('Error al actualizar el cliente:', error); // Usar console.error directamente
        res.status(500).json({ error: 'Error interno del servidor al actualizar el cliente.' });
    }
};

// 5. ELIMINAR CLIENTE (Borrado Lógico - Usando SQL Directo)
clientesCtl.deleteClient = async (req, res) => {
    const logger = getLogger(req);
    const { id } = req.params;
    logger.info(`[CLIENTE] Solicitud de eliminación lógica de cliente con ID: ${id}`);

    try {
        // SQL directo para actualizar estado a 'eliminado'
        const [resultadoSQL] = await sql.promise().query("UPDATE clientes SET estado = 'eliminado', fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ? AND estado = 'activo'", [id]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.warn(`[CLIENTE] Cliente no encontrado o ya eliminado con ID: ${id}`);
            return res.status(404).json({ error: 'Cliente no encontrado o ya estaba eliminado.' });
        }
        logger.info(`[CLIENTE] Cliente SQL marcado como eliminado con ID: ${id}`);

        // Actualizar estado a 'eliminado' en MongoDB
        await mongo.Cliente.updateOne(
            { idClienteSql: id }, 
            { $set: { estado: 'eliminado' }, $currentDate: { fecha_modificacion: true } }
        );
        logger.info(`[CLIENTE] Cliente Mongo marcado como eliminado para ID SQL: ${id}`);
        
        res.status(200).json({ message: 'Cliente marcado como eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar el cliente:', error); // Usar console.error directamente
        res.status(500).json({ error: 'Error interno del servidor al eliminar el cliente.' });
    }
};

// 6. LOGIN CLIENTE (Con correo y contraseña - Usando SQL Directo)
clientesCtl.loginClient = async (req, res) => {
    const logger = getLogger(req);
    const { correo_electronico, contrasena, deviceId, tipo_dispositivo, modelo_dispositivo } = req.body;
    logger.info(`[CLIENTE] Intento de login: correo=${correo_electronico}`);

    try {
        if (!correo_electronico || !contrasena) {
            logger.warn('[CLIENTE] Login fallido: correo o contraseña faltantes.');
            return res.status(400).json({ success: false, message: 'Correo y contraseña son requeridos.' });
        }

        // Buscar cliente por correo electrónico (descifrando y comparando)
        const [allClientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE estado = 'activo'");
        const clienteSQL = allClientesSQL.find(c => safeDecrypt(c.correo_electronico) === correo_electronico);

        if (!clienteSQL) {
            logger.warn(`[CLIENTE] Login fallido: Cliente no encontrado o inactivo para el correo "${correo_electronico}".`);
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas o cliente inactivo.' });
        }
        logger.info(`[CLIENTE] Cliente encontrado en SQL con ID: ${clienteSQL.id}`);

        // Comparar la contraseña hasheada
        const passwordMatch = await bcrypt.compare(contrasena, clienteSQL.contrasena_hash);
        if (!passwordMatch) {
            logger.warn(`[CLIENTE] Login fallido: Contraseña incorrecta para cliente ID: ${clienteSQL.id}.`);
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }
        logger.info(`[CLIENTE] Contraseña verificada para cliente ID: ${clienteSQL.id}.`);

        // Lógica de registro/actualización de dispositivo (adaptada de tu código original y usando SQL directo)
        if (deviceId && tipo_dispositivo && modelo_dispositivo) {
            logger.info(`[DISPOSITIVO] Gestionando dispositivo para cliente ${clienteSQL.id} durante el login.`);
            
            let dispositivoDelCliente = null;
            let dispositivoDeOtroClienteActivo = null;

            // Obtener todos los dispositivos y buscar coincidencias
            // Cambiado a 'clienteId'
            const [allDevicesSQL] = await sql.promise().query("SELECT * FROM dispositivos");
            for (const dev of allDevicesSQL) {
                try {
                    const decryptedDeviceId = descifrarDato(dev.token_dispositivo);
                    if (decryptedDeviceId === deviceId) {
                        // Cambiado a 'clienteId'
                        if (dev.clienteId === clienteSQL.id) {
                            dispositivoDelCliente = dev;
                        } else if (dev.estado === 'activo') {
                            dispositivoDeOtroClienteActivo = dev;
                        }
                    }
                } catch (decryptionError) {
                    logger.error(`[DISPOSITIVO] Error al descifrar un token de dispositivo: ${decryptionError.message}`);
                }
            }

            // 1. Desactivar el dispositivo si pertenece a otro cliente y está activo
            if (dispositivoDeOtroClienteActivo) {
                // Cambiado a 'clienteId'
                logger.warn(`[DISPOSITIVO] Dispositivo "${deviceId}" ya estaba activo para otro cliente (${dispositivoDeOtroClienteActivo.clienteId}). Desactivándolo.`);
                await sql.promise().query("UPDATE dispositivos SET estado = 'inactivo', fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?", [dispositivoDeOtroClienteActivo.id]);
            }

            // 2. Activar o crear el dispositivo para el cliente actual
            if (dispositivoDelCliente) {
                if (dispositivoDelCliente.estado === 'inactivo') {
                    logger.info(`[DISPOSITIVO] Reactivando dispositivo para cliente ${clienteSQL.id}.`);
                    await sql.promise().query("UPDATE dispositivos SET estado = 'activo', fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?", [dispositivoDelCliente.id]);
                } else {
                    logger.info(`[DISPOSITIVO] Dispositivo ya activo para cliente ${clienteSQL.id}.`);
                }
            } else {
                // No existe un dispositivo para este cliente, crearlo
                logger.info(`[DISPOSITIVO] Creando nuevo registro de dispositivo para cliente ${clienteSQL.id}.`);
                await sql.promise().query(
                    // Cambiado a 'clienteId'
                    "INSERT INTO dispositivos (clienteId, token_dispositivo, tipo_dispositivo, modelo_dispositivo, estado, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    [clienteSQL.id, cifrarDato(deviceId), cifrarDato(tipo_dispositivo), cifrarDato(modelo_dispositivo), 'activo']
                );
            }
        } else {
            logger.info(`[DISPOSITIVO] No se recibieron datos de dispositivo para registrar/actualizar durante el login.`);
        }

        // Guardar información en la sesión (como en usuario.controller.js)
        req.session.clienteId = clienteSQL.id;
        req.session.clienteNombre = safeDecrypt(clienteSQL.nombre);
        req.session.clienteEmail = safeDecrypt(clienteSQL.correo_electronico);
        req.session.tipoUsuario = 'cliente';
        logger.info(`[CLIENTE] Sesión establecida para cliente ID: ${clienteSQL.id}.`);

        res.status(200).json({ 
            success: true, 
            message: 'Inicio de sesión exitoso', 
            user: {
                id: clienteSQL.id,
                nombre: safeDecrypt(clienteSQL.nombre),
                email: safeDecrypt(clienteSQL.correo_electronico)
            }
        });

    } catch (error) {
        console.error('Error en el login del cliente:', error.message); // Usar console.error directamente
        res.status(500).json({ success: false, message: 'Error interno del servidor en el login.' });
    }
};

// 7. LOGIN POR DEVICE ID (Usando SQL Directo)
clientesCtl.deviceLoginHandler = async (req, res) => {
    const logger = getLogger(req);
    const { deviceId } = req.body;
    logger.info(`[CLIENTE] Intento de device-login con deviceId: ${deviceId}`);

    try {
        if (!deviceId) {
            logger.warn('[CLIENTE] Device-login fallido: deviceId faltante.');
            return res.status(400).json({ success: false, message: 'deviceId es requerido.' });
        }

        let dispositivoEncontrado = null;
        // Buscar el dispositivo más reciente que coincida con el deviceId y esté activo
        const [dispositivosActivosSQL] = await sql.promise().query("SELECT * FROM dispositivos WHERE estado = 'activo' ORDER BY fecha_creacion DESC");

        for (const disp of dispositivosActivosSQL) {
            try {
                const decryptedDeviceId = descifrarDato(disp.token_dispositivo);
                if (decryptedDeviceId === deviceId) {
                    dispositivoEncontrado = disp;
                    break; // Encontrado el más reciente
                }
            } catch (decryptionError) {
                logger.error(`[DISPOSITIVO] Error al descifrar token_dispositivo durante device-login: ${decryptionError.message}`);
            }
        }

        if (!dispositivoEncontrado) {
            logger.warn(`[CLIENTE] Device-login fallido: deviceId "${deviceId}" no encontrado o no activo.`);
            return res.status(401).json({ success: false, message: 'Dispositivo no autorizado o inactivo.' });
        }
        logger.info(`[CLIENTE] Dispositivo encontrado (ID: ${dispositivoEncontrado.id}) para deviceId: ${deviceId}.`);

        // Buscar el cliente asociado
        // Cambiado a 'clienteId'
        const [clientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE id = ? AND estado = 'activo'", [dispositivoEncontrado.clienteId]);
        const clienteSQL = clientesSQL[0];

        if (!clienteSQL) {
            // Cambiado a 'clienteId'
            logger.warn(`[CLIENTE] Device-login fallido: Cliente asociado (ID: ${dispositivoEncontrado.clienteId}) no encontrado o inactivo.`);
            return res.status(401).json({ success: false, message: 'Cliente asociado no encontrado o inactivo.' });
        }
        logger.info(`[CLIENTE] Cliente asociado encontrado para device-login (ID: ${clienteSQL.id}).`);

        // Guardar sesión
        req.session.clienteId = clienteSQL.id;
        req.session.clienteNombre = safeDecrypt(clienteSQL.nombre);
        req.session.clienteEmail = safeDecrypt(clienteSQL.correo_electronico);
        req.session.tipoUsuario = 'cliente';
        logger.info(`[CLIENTE] Sesión establecida para device-login de cliente ID: ${clienteSQL.id}.`);

        res.status(200).json({ 
            success: true, 
            message: 'Device login exitoso', 
            user: { 
                id: clienteSQL.id, 
                nombre: safeDecrypt(clienteSQL.nombre), 
                email: safeDecrypt(clienteSQL.correo_electronico) 
            } 
        });

    } catch (error) {
        console.error('Error en el device-login del cliente:', error.message); // Usar console.error directamente
        res.status(500).json({ success: false, message: 'Error interno del servidor en device login.' });
    }
};


module.exports = clientesCtl;
