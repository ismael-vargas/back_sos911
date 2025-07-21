// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../Database/dataBase.sql'); // MySQL directo
const mongo = require('../Database/dataBase.mongo'); // Para Mongoose (MongoDB)

const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

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

// Utilidad para obtener el logger (manteniendo lo que ya tenías)
function getLogger(req) {
  return req.app && req.app.get ? req.app.get('logger') : console;
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

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // **Validación de unicidad para correo_electronico y cedula_identidad**
        // Obtener todos los clientes para verificar unicidad (descifrando y comparando)
        const [allClientesSQL] = await sql.promise().query("SELECT correo_electronico, cedula_identidad FROM clientes");

        const isEmailTaken = allClientesSQL.some(c => safeDecrypt(c.correo_electronico) === correo_electronico);
        if (isEmailTaken) {
            logger.warn(`[CLIENTE] Creación fallida: El correo electrónico "${correo_electronico}" ya está registrado.`);
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }

        const isCedulaTaken = allClientesSQL.some(c => safeDecrypt(c.cedula_identidad) === cedula_identidad);
        if (isCedulaTaken) {
            logger.warn(`[CLIENTE] Creación fallida: La cédula de identidad "${cedula_identidad}" ya está registrada.`);
            return res.status(409).json({ message: 'La cédula de identidad ya está registrada.' });
        }

        // Cifrar datos sensibles y contraseña
        const nombreCifrado = cifrarDato(nombre);
        const correoCifrado = cifrarDato(correo_electronico);
        const cedulaCifrada = cifrarDato(cedula_identidad);
        const contrasenaCifrada = cifrarDato(contrasena); // Cifrado de contraseña con cifrarDato

        // Crear cliente en la base de datos SQL usando ORM (orm.cliente.create())
        const nuevoClienteSQL = {
            nombre: nombreCifrado,
            correo_electronico: correoCifrado,
            cedula_identidad: cedulaCifrada,
            contrasena_hash: contrasenaCifrada, // Usar la contraseña cifrada
            numero_ayudas: 0,
            estado: 'activo',
            fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
            // fecha_modificacion NO se incluye en la creación, se actualizará en modificaciones
        };
        const clienteGuardadoSQL = await orm.cliente.create(nuevoClienteSQL);
        const idClienteSql = clienteGuardadoSQL.id; // Obtener el ID insertado por ORM
        logger.info(`[CLIENTE] Cliente SQL creado exitosamente con ID: ${idClienteSql}`);

        // Crear documento en la base de datos MongoDB
        // fecha_creacion se establece, fecha_modificacion no se incluye en la creación inicial
        const nuevoClienteMongo = { 
            idClienteSql, 
            fecha_nacimiento, 
            direccion: cifrarDato(direccion), // Cifrar dirección en Mongo
            estado: 'activo', // Estado por defecto
            fecha_creacion: formattedNow // Se añade la fecha de creación para Mongo (hora local formateada)
        };
        await mongo.Cliente.create(nuevoClienteMongo);
        logger.info(`[CLIENTE] Cliente Mongo creado exitosamente para ID SQL: ${idClienteSql}`);

        // Registrar dispositivo si se envía
        if (deviceId && tipo_dispositivo && modelo_dispositivo) {
            logger.info(`[DISPOSITIVO] Registrando dispositivo para nuevo cliente: ${idClienteSql}, deviceId=${deviceId}`);
            
            // Desactivar cualquier dispositivo existente con el mismo deviceId (sin importar el cliente_id)
            const [todosDispositivosSQL] = await sql.promise().query("SELECT id, token_dispositivo, clienteId FROM dispositivos WHERE estado = 'activo'");
            for (const disp of todosDispositivosSQL) {
                try {
                    const deviceIdDescifrado = descifrarDato(disp.token_dispositivo);
                    if (deviceIdDescifrado === deviceId) {
                        await sql.promise().query("UPDATE dispositivos SET estado = 'inactivo', fecha_modificacion = ? WHERE id = ?", [formattedNow, disp.id]); // Usar 'formattedNow'
                        logger.info(`[DISPOSITIVO] Dispositivo previamente activo desactivado: clienteId=${disp.clienteId}, deviceId=${deviceId}`);
                    }
                } catch (error) {
                    logger.warn(`[DISPOSITIVO] Error al descifrar token en registro de dispositivo: ${error.message}`);
                }
            }

            // Crear el nuevo dispositivo para este cliente usando ORM (orm.dispositivos.create())
            const nuevoDispositivo = {
                clienteId: idClienteSql,
                token_dispositivo: cifrarDato(deviceId),
                tipo_dispositivo: cifrarDato(tipo_dispositivo),
                modelo_dispositivo: cifrarDato(modelo_dispositivo),
                estado: 'activo',
                fecha_creacion: formattedNow, // Se añade la fecha de creación (hora local formateada)
                // fecha_modificacion NO se incluye en la creación
            };
            await orm.dispositivos.create(nuevoDispositivo);
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
        const estadoQuery = incluirEliminados === 'true' ? "" : " WHERE estado = 'activo'";
        const [clientesSQL] = await sql.promise().query(`SELECT * FROM clientes${estadoQuery}`);
        
        const clientesCompletos = await Promise.all(
            clientesSQL.map(async (clienteSQL) => {
                let clienteMongo = null;
                // SOLO si se encuentra un cliente en SQL, intentamos buscar en Mongo
                if (clienteSQL) { 
                    clienteMongo = await mongo.Cliente.findOne({ idClienteSql: clienteSQL.id });
                }
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
        logger.error('Error al obtener todos los clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener clientes.' });
    }
};

// 3. OBTENER CLIENTE POR ID (Usando SQL Directo)
clientesCtl.getClientById = async (req, res) => {
    const logger = getLogger(req);
    // Se usa req.session.clienteId si la solicitud viene de un cliente logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idCliente = req.session.clienteId ? req.session.clienteId : req.params.id; 
    logger.info(`[CLIENTE] Solicitud de obtención de cliente por ID: ${idCliente}`);

    try {
        const [clientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE id = ? AND estado = 'activo'", [idCliente]);
        
        if (clientesSQL.length === 0) {
            logger.warn(`[CLIENTE] Cliente no encontrado o eliminado con ID: ${idCliente}`);
            return res.status(404).json({ error: 'Cliente no encontrado o eliminado.' });
        }
        
        const clienteSQL = clientesSQL[0];
        logger.info(`[CLIENTE] Cliente SQL encontrado con ID: ${idCliente}`);

        let clienteMongo = null;
        // SOLO si se encuentra un cliente en SQL, intentamos buscar en Mongo
        if (clienteSQL) {
            clienteMongo = await mongo.Cliente.findOne({ idClienteSql: idCliente });
        }
        logger.info(`[CLIENTE] Cliente Mongo encontrado para ID SQL: ${idCliente}`);

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
        logger.error('Error al obtener el cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener el cliente.' });
    }
};

// 4. ACTUALIZAR CLIENTE (Usando SQL Directo)
clientesCtl.updateClient = async (req, res) => {
    const logger = getLogger(req);
    // Se usa req.session.clienteId si la solicitud viene de un cliente logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idCliente = req.session.clienteId ? req.session.clienteId : req.params.id; 
    const { nombre, correo_electronico, cedula_identidad, contrasena, fecha_nacimiento, direccion, estado, numero_ayudas } = req.body;
    logger.info(`[CLIENTE] Solicitud de actualización de cliente con ID: ${idCliente}`);

    try {
        // Verificar si el cliente existe en SQL y está activo
        const [clientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE id = ? AND estado = 'activo'", [idCliente]);
        if (clientesSQL.length === 0) {
            logger.warn(`[CLIENTE] Cliente no encontrado para actualizar con ID: ${idCliente}`);
            return res.status(404).json({ error: 'Cliente no encontrado o eliminado para actualizar.' });
        }
        const clienteSQL = clientesSQL[0];

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Validar que el nuevo usuarioId (si se proporciona) exista y esté activo
        // (Esta lógica no existe en clientes, pero se mantiene la estructura de validación)
        // if (usuarioId !== undefined && usuarioId !== serviceSQL.usuarioId) { ... }

        // Preparar datos para SQL (solo los que no son undefined)
        const camposSQL = [];
        const valoresSQL = [];
        
        if (nombre !== undefined) {
            camposSQL.push('nombre = ?');
            valoresSQL.push(cifrarDato(nombre));
        }
        if (cedula_identidad !== undefined) {
            // **Validación de unicidad para cedula_identidad en actualización**
            const [allOtherClientesSQLCedula] = await sql.promise().query("SELECT id, cedula_identidad FROM clientes WHERE id != ? AND estado = 'activo'", [idCliente]);
            const existingClienteWithNewCedula = allOtherClientesSQLCedula.find(c => safeDecrypt(c.cedula_identidad) === cedula_identidad);

            if (existingClienteWithNewCedula) {
                logger.warn(`[CLIENTE] Actualización fallida: La nueva cédula de identidad "${cedula_identidad}" ya está registrada por otro cliente.`);
                return res.status(409).json({ message: 'La nueva cédula de identidad ya está registrada por otro cliente.' });
            }
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
            valoresSQL.push(cifrarDato(contrasena)); // Cifrado de contraseña con cifrarDato
        }
        
        // Si el correo se actualiza, verificar y actualizar el correo_electronico cifrado
        if (correo_electronico !== undefined) {
            // **Validación de unicidad para correo_electronico en actualización**
            const [allOtherClientesSQLEmail] = await sql.promise().query("SELECT id, correo_electronico FROM clientes WHERE id != ? AND estado = 'activo'", [idCliente]);
            const existingClienteWithNewEmail = allOtherClientesSQLEmail.find(c => safeDecrypt(c.correo_electronico) === correo_electronico);

            if (existingClienteWithNewEmail) {
                logger.warn(`[CLIENTE] Actualización fallida: El nuevo correo electrónico "${correo_electronico}" ya está registrado por otro cliente.`);
                return res.status(409).json({ message: 'El nuevo correo electrónico ya está registrado por otro cliente.' });
            }
            camposSQL.push('correo_electronico = ?');
            valoresSQL.push(cifrarDato(correo_electronico));
        }

        // Solo actualizar SQL si hay campos para actualizar
        if (camposSQL.length > 0) {
            // Siempre actualizar fecha_modificacion en SQL
            camposSQL.push('fecha_modificacion = ?');
            valoresSQL.push(formattedNow); // CAMBIO: Usar formattedNow

            valoresSQL.push(idCliente); // Para el WHERE
            const consultaSQL = `UPDATE clientes SET ${camposSQL.join(', ')} WHERE id = ?`;
            const [resultadoSQLUpdate] = await sql.promise().query(consultaSQL, valoresSQL);
            
            if (resultadoSQLUpdate.affectedRows === 0) {
                logger.warn(`[CLIENTE] No se pudo actualizar el cliente SQL con ID: ${idCliente}.`);
            } else {
                logger.info(`[CLIENTE] Cliente SQL actualizado con ID: ${idCliente}`);
            }
        }

        // Preparar datos para actualización en MongoDB
        const updateDataMongo = {};
        if (fecha_nacimiento !== undefined) updateDataMongo.fecha_nacimiento = fecha_nacimiento;
        if (direccion !== undefined) updateDataMongo.direccion = cifrarDato(direccion); // Cifrar dirección en Mongo
        // Replicar el estado si se actualiza en SQL
        if (estado !== undefined) updateDataMongo.estado = estado;

        // Siempre actualizar fecha_modificacion en Mongo
        updateDataMongo.fecha_modificacion = formattedNow; // CAMBIO: Usar formattedNow

        // Realizar actualización en MongoDB
        if (Object.keys(updateDataMongo).length > 0) {
            await mongo.Cliente.updateOne({ idClienteSql: idCliente }, { $set: updateDataMongo });
            logger.info(`[CLIENTE] Cliente Mongo actualizado para ID SQL: ${idCliente}`);
        }
        
        // Obtener el cliente actualizado para la respuesta (usando SQL directo y Mongo)
        const [updatedClientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE id = ?", [idCliente]);
        const updatedClienteSQL = updatedClientesSQL[0];
        const updatedClienteMongo = await mongo.Cliente.findOne({ idClienteSql: idCliente });

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
        logger.error('Error al actualizar el cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el cliente.' });
    }
};

// 5. ELIMINAR CLIENTE (Borrado Lógico - Usando SQL Directo)
clientesCtl.deleteClient = async (req, res) => {
    const logger = getLogger(req);
    // Se usa req.session.clienteId si la solicitud viene de un cliente logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idCliente = req.session.clienteId ? req.session.clienteId : req.params.id; 
    logger.info(`[CLIENTE] Solicitud de eliminación lógica de cliente con ID: ${idCliente}`);

    try {
        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultadoSQL] = await sql.promise().query("UPDATE clientes SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", [formattedNow, idCliente]);
        
        if (resultadoSQL.affectedRows === 0) {
            logger.warn(`[CLIENTE] Cliente no encontrado o ya eliminado con ID: ${idCliente}`);
            return res.status(404).json({ error: 'Cliente no encontrado o ya estaba eliminado.' });
        }
        logger.info(`[CLIENTE] Cliente SQL marcado como eliminado con ID: ${idCliente}`);

        // Actualizar estado a 'eliminado' en MongoDB
        await mongo.Cliente.updateOne(
            { idClienteSql: idCliente }, 
            { $set: { estado: 'eliminado', fecha_modificacion: formattedNow } }
        );
        logger.info(`[CLIENTE] Cliente Mongo marcado como eliminado para ID SQL: ${idCliente}`);
        
        res.status(200).json({ message: 'Cliente marcado como eliminado exitosamente.' });
    } catch (error) {
        logger.error('Error al eliminar el cliente:', error);
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

        // Comparar la contraseña descifrando
        const contrasena_descifrada = descifrarDato(clienteSQL.contrasena_hash);
        if (contrasena !== contrasena_descifrada) {
            logger.warn(`[CLIENTE] Login fallido: Contraseña incorrecta para cliente ID: ${clienteSQL.id}.`);
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }
        logger.info(`[CLIENTE] Contraseña verificada para cliente ID: ${clienteSQL.id}.`);

        const now = new Date(); 
        // CAMBIO: Formatear la fecha a string 'YYYY-MM-DD HH:mm:ss' para columnas STRING
        const formattedNow = formatLocalDateTime(now);

        // Lógica de registro/actualización de dispositivo (adaptada de tu código original y usando SQL directo)
        if (deviceId && tipo_dispositivo && modelo_dispositivo) {
            logger.info(`[DISPOSITIVO] Gestionando dispositivo para cliente ${clienteSQL.id} durante el login.`);
            
            let dispositivoDelCliente = null;
            let dispositivoDeOtroClienteActivo = null;

            // Obtener todos los dispositivos y buscar coincidencias
            const [allDevicesSQL] = await sql.promise().query("SELECT * FROM dispositivos");
            for (const disp of allDevicesSQL) {
                try {
                    const decryptedDeviceId = descifrarDato(disp.token_dispositivo);
                    if (decryptedDeviceId === deviceId) {
                        if (disp.clienteId === clienteSQL.id) {
                            dispositivoDelCliente = disp;
                        } else if (disp.estado === 'activo') {
                            dispositivoDeOtroClienteActivo = disp;
                        }
                    }
                } catch (decryptionError) {
                    logger.error(`[DISPOSITIVO] Error al descifrar token_dispositivo durante device-login: ${decryptionError.message}`);
                }
            }

            // 1. Desactivar el dispositivo si pertenece a otro cliente y está activo
            if (dispositivoDeOtroClienteActivo) {
                logger.warn(`[DISPOSITIVO] Dispositivo "${deviceId}" ya estaba activo para otro cliente (${dispositivoDeOtroClienteActivo.clienteId}). Desactivándolo.`);
                await sql.promise().query("UPDATE dispositivos SET estado = 'inactivo', fecha_modificacion = ? WHERE id = ?", [formattedNow, dispositivoDeOtroClienteActivo.id]);
            }

            // 2. Activar o crear el dispositivo para el cliente actual
            if (dispositivoDelCliente) {
                if (dispositivoDelCliente.estado === 'inactivo') {
                    logger.info(`[DISPOSITIVO] Reactivando dispositivo para cliente ${clienteSQL.id}.`);
                    await sql.promise().query("UPDATE dispositivos SET estado = 'activo', fecha_modificacion = ? WHERE id = ?", [formattedNow, dispositivoDelCliente.id]);
                } else {
                    logger.info(`[DISPOSITIVO] Dispositivo ya activo para cliente ${clienteSQL.id}.`);
                }
            } else {
                // No existe un dispositivo para este cliente, crearlo
                logger.info(`[DISPOSITIVO] Creando nuevo registro de dispositivo para cliente ${clienteSQL.id}.`);
                // fecha_modificacion NO se incluye en la creación, se actualizará en modificaciones
                await sql.promise().query(
                    "INSERT INTO dispositivos (clienteId, token_dispositivo, tipo_dispositivo, modelo_dispositivo, estado, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?)",
                    [clienteSQL.id, cifrarDato(deviceId), cifrarDato(tipo_dispositivo), cifrarDato(modelo_dispositivo), 'activo', formattedNow]
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
        logger.error('Error en el login del cliente:', error.message);
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
        const [clientesSQL] = await sql.promise().query("SELECT * FROM clientes WHERE id = ? AND estado = 'activo'", [dispositivoEncontrado.clienteId]);
        const clienteSQL = clientesSQL[0];

        if (!clienteSQL) {
            logger.warn(`[CLIENTE] Device-login fallido: Cliente asociado (ID: ${dispositivoEncontrado.clienteId}) no encontrado o inactivo.`);
            return res.status(401).json({ success: false, message: 'Cliente asociado no encontrado o inactivo.' });
        }
        logger.info(`[CLIENTE] Cliente asociado encontrado para device-login (ID: ${clienteSQL.id}).`);

        // Guardar información en la sesión (como en usuario.controller.js)
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
        logger.error('Error en el device-login del cliente:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor en device login.' });
    }
};

module.exports = clientesCtl;
