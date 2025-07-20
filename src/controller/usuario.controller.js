// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../Database/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../Database/dataBase.sql'); // MySQL directo
const mongo = require('../Database/dataBase.mongo'); // Para Mongoose (MongoDB)
const { cifrarDato, descifrarDato } = require('../lib/encrypDates');

const usersCtl = {};

// --- Utilidad para Descifrado Seguro ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos:', error.message);
        return '';
    }
}

// --- CRUD de Usuarios ---
usersCtl.createUser = async (req, res) => {
    const { nombre, correo_electronico, cedula_identidad, contrasena, fecha_nacimiento, direccion, estado } = req.body; // Se añade 'estado' al destructuring
    try {
        // Validación: Verificar si el correo electrónico ya existe
        const [existingEmail] = await sql.promise().query("SELECT correo_electronico FROM usuarios");
        const isEmailTaken = existingEmail.some(user => safeDecrypt(user.correo_electronico) === correo_electronico);

        if (isEmailTaken) {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
        }

        // Validación: Verificar si la cédula de identidad ya existe
        const [existingCedula] = await sql.promise().query("SELECT cedula_identidad FROM usuarios");
        const isCedulaTaken = existingCedula.some(user => safeDecrypt(user.cedula_identidad) === cedula_identidad);

        if (isCedulaTaken) {
            return res.status(400).json({ error: 'La cédula de identidad ya está registrada.' });
        }

        // La contraseña ahora se cifrará con la función 'cifrarDato' para que sea descifrable
        const contrasena_cifrada = cifrarDato(contrasena); 
        const now = new Date().toISOString(); // Obtiene la fecha y hora actual en formato ISO

        const nuevoUsuarioSQL = {
            nombre: cifrarDato(nombre),
            correo_electronico: cifrarDato(correo_electronico),
            cedula_identidad: cifrarDato(cedula_identidad), 
            contrasena_hash: contrasena_cifrada, // Se usa la contraseña cifrada con crypto
            estado: estado || 'activo', // Se cambia el estado por defecto a 'activo'
            fecha_creacion: now, // Se añade la fecha de creación
        };
        const usuarioGuardadoSQL = await orm.usuario.create(nuevoUsuarioSQL);
        const idUsuarioSql = usuarioGuardadoSQL.id;
        
        const nuevoUsuarioMongo = { 
            idUsuarioSql, 
            fecha_nacimiento, 
            direccion, 
            estado: estado || 'activo', // Se asegura que el estado también se guarde en Mongo con el nuevo valor por defecto
            fecha_creacion: now, // Se añade la fecha de creación para Mongo
        };
        await mongo.Usuario.create(nuevoUsuarioMongo);
        res.status(201).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) {
        console.error('Error al crear el usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS USUARIOS (Usando SQL Directo)
usersCtl.getAllUsers = async (req, res) => {
    try {
        // Se usa la conexión 'sql' para una consulta directa
        const [usuariosSQL] = await sql.promise().query("SELECT * FROM usuarios WHERE estado = 'activo'");
        
        const usuariosCompletos = await Promise.all(
            usuariosSQL.map(async (userSQL) => {
                let usuarioMongo = null;
                // SOLO si se encuentra un usuario en SQL, intentamos buscar en Mongo
                if (userSQL) { 
                    usuarioMongo = await mongo.Usuario.findOne({ idUsuarioSql: userSQL.id });
                    // Opcional: Si el profesor quiere un control más estricto,
                    // se podría añadir un 'if' aquí para verificar el estado en Mongo también,
                    // por ejemplo: if (usuarioMongo && usuarioMongo.estado !== 'bloqueado')
                }

                return {
                    id: userSQL.id,
                    nombre: safeDecrypt(userSQL.nombre),
                    correo_electronico: safeDecrypt(userSQL.correo_electronico),
                    cedula_identidad: safeDecrypt(userSQL.cedula_identidad),
                    estado: userSQL.estado,
                    fecha_nacimiento: usuarioMongo ? usuarioMongo.fecha_nacimiento : null,
                    direccion: usuarioMongo ? usuarioMongo.direccion : null,
                    fecha_creacion: userSQL.fecha_creacion, // Se añade la fecha de creación de SQL
                    fecha_modificacion: userSQL.fecha_modificacion, // Se añade la fecha de modificación de SQL
                };
            })
        );
        res.status(200).json(usuariosCompletos);
    } catch (error) {
        console.error('Error al obtener todos los usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER USUARIO POR ID (Usando SQL Directo)
usersCtl.getUserById = async (req, res) => {
    // Se usa req.user.id si la solicitud viene de un usuario logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idUsuario = req.user ? req.user.id : req.params.id; 

    try {
        // SQL directo en lugar de ORM
        const [usuariosSQL] = await sql.promise().query("SELECT * FROM usuarios WHERE id = ? AND estado = 'activo'", [idUsuario]);
        
        if (usuariosSQL.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        
        const usuarioSQL = usuariosSQL[0];
        let usuarioMongo = null;

        // SOLO si se encuentra un usuario en SQL, intentamos buscar en Mongo
        if (usuarioSQL) {
            usuarioMongo = await mongo.Usuario.findOne({ idUsuarioSql: idUsuario });
            // Opcional: Si el profesor quiere un control más estricto,
            // se podría añadir un 'if' aquí para verificar el estado en Mongo también.
        }

        const usuarioCompleto = {
            id: usuarioSQL.id,
            nombre: safeDecrypt(usuarioSQL.nombre),
            correo_electronico: safeDecrypt(usuarioSQL.correo_electronico),
            cedula_identidad: safeDecrypt(usuarioSQL.cedula_identidad),
            estado: usuarioSQL.estado,
            fecha_nacimiento: usuarioMongo?.fecha_nacimiento || null,
            direccion: usuarioMongo?.direccion || null,
            fecha_creacion: usuarioSQL.fecha_creacion, // Se añade la fecha de creación de SQL
            fecha_modificacion: usuarioSQL.fecha_modificacion, // Se añade la fecha de modificación de SQL
        };
        res.status(200).json(usuarioCompleto);
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. ACTUALIZAR USUARIO (Usando SQL Directo)
usersCtl.updateUser = async (req, res) => {
    // Se usa req.user.id si la solicitud viene de un usuario logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idUsuario = req.user ? req.user.id : req.params.id; 
    const { nombre, correo_electronico, cedula_identidad, fecha_nacimiento, direccion, estado } = req.body;
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date().toISOString(); // Obtiene la fecha y hora actual para la modificación

        if (nombre) {
            campos.push('nombre = ?');
            valores.push(cifrarDato(nombre));
        }
        if (correo_electronico) {
            campos.push('correo_electronico = ?');
            valores.push(cifrarDato(correo_electronico));
        }
        if (cedula_identidad) {
            campos.push('cedula_identidad = ?');
            valores.push(cifrarDato(cedula_identidad));
        }
        if (estado) {
            campos.push('estado = ?');
            valores.push(estado);
        }
        
        // Siempre actualizar fecha_modificacion en SQL
        campos.push('fecha_modificacion = ?');
        valores.push(now);

        if (campos.length > 0) {
            valores.push(idUsuario); // Para el WHERE, usando el ID del usuario logueado o del parámetro
            const consultaSQL = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado en SQL.' });
            }
        }
        
        // Actualizar MongoDB
        const datosParaMongo = { fecha_nacimiento, direccion, estado };
        // Eliminar propiedades undefined para que no se sobrescriban con 'undefined' en Mongo
        Object.keys(datosParaMongo).forEach(key => datosParaMongo[key] === undefined && delete datosParaMongo[key]);
        
        // Cifrar la dirección si se está actualizando y no es undefined
        if (datosParaMongo.direccion) {
            datosParaMongo.direccion = cifrarDato(datosParaMongo.direccion);
        }
        
        // Siempre actualizar fecha_modificacion en Mongo
        datosParaMongo.fecha_modificacion = now;

        await mongo.Usuario.updateOne({ idUsuarioSql: idUsuario }, { $set: datosParaMongo });
        
        res.status(200).json({ message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ELIMINAR USUARIO (Usando SQL Directo)
usersCtl.deleteUser = async (req, res) => {
    // Se usa req.user.id si la solicitud viene de un usuario logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idUsuario = req.user ? req.user.id : req.params.id; 
    try {
        const now = new Date().toISOString();
        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query("UPDATE usuarios SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [now, idUsuario]);
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        
        // Actualizar MongoDB
        await mongo.Usuario.updateOne({ idUsuarioSql: idUsuario }, { $set: { estado: 'eliminado', fecha_modificacion: now } });
        
        res.status(200).json({ message: 'Usuario marcado como eliminado.' });
    } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. LOGIN USUARIO (Usando SQL Directo)
usersCtl.loginUser = async (req, res) => {
    const { correo_electronico, contrasena } = req.body;
    try {
        // SQL directo para obtener todos los usuarios activos
        const [usuariosSQL] = await sql.promise().query("SELECT * FROM usuarios WHERE estado = 'activo'");
        
        // Buscar usuario por correo descifrado
        const user = usuariosSQL.find(u => descifrarDato(u.correo_electronico) === correo_electronico);
        
        if (!user) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }
        
        // Ahora se descifra la contraseña almacenada y se compara directamente
        const contrasena_descifrada = descifrarDato(user.contrasena_hash);
        if (contrasena !== contrasena_descifrada) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }
        
        res.status(200).json({ message: "Login exitoso", userId: user.id });
    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// --- CRUD de Preferencias (Asociadas a un Usuario) ---

usersCtl.registerPreferences = async (req, res) => {
    // Se usa req.user.id si la solicitud viene de un usuario logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idUsuario = req.user ? req.user.id : req.params.id; 
    const { tema, sidebarMinimizado } = req.body;
    try {
        const now = new Date().toISOString(); // Obtiene la fecha y hora actual en formato ISO

        // CORREGIDO: Se usa 'orm.preferencias' en singular y se añaden 'estado' y 'fecha_creacion'
        const nuevaPreferenciaSQL = { 
            tema, 
            usuarioId: idUsuario,
            estado: 'activo', // Asegurar que el estado se guarde
            fecha_creacion: now, // Asegurar que la fecha de creación se guarde
        }; 
        const preferenciaGuardadaSQL = await orm.preferencias.create(nuevaPreferenciaSQL);
        const idPreferenciaSql = preferenciaGuardadaSQL.id;
        
        // CORREGIDO: Se usa 'mongo.Preferencias' con mayúscula
        const nuevaPreferenciaMongo = { 
            idPreferenciaSql, 
            sidebarMinimizado,
            estado: 'activo', // Asegurar que el estado se guarde en Mongo
            fecha_creacion: now, // Asegurar que la fecha de creación se guarde en Mongo
        };
        await mongo.Preferencias.create(nuevaPreferenciaMongo);
        
        res.status(201).json({ message: 'Preferencias registradas exitosamente.' });
    } catch (error) {
        console.error('Error al registrar las preferencias:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// OBTENER USUARIO CON PREFERENCIAS (Usando SQL Directo)
usersCtl.getUserWithPreferences = async (req, res) => {
    // Se usa req.user.id si la solicitud viene de un usuario logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idUsuario = req.user ? req.user.id : req.params.id; 
    try {
        // SQL directo para obtener usuario
        const [usuariosSQL] = await sql.promise().query("SELECT * FROM usuarios WHERE id = ? AND estado = 'activo'", [idUsuario]);
        
        if (usuariosSQL.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        
        const usuarioSQL = usuariosSQL[0];
        
        // SQL directo para obtener preferencias
        const [preferenciasSQL] = await sql.promise().query("SELECT * FROM preferencias WHERE usuarioId = ?", [idUsuario]);
        
        let preferenciasMongo = null;
        if (preferenciasSQL.length > 0) {
            // CORREGIDO: Se usa 'mongo.Preferencias' con mayúscula
            preferenciasMongo = await mongo.Preferencias.findOne({ idPreferenciaSql: preferenciasSQL[0].id });
        }
        
        const resultado = {
            id: usuarioSQL.id,
            nombre: safeDecrypt(usuarioSQL.nombre),
            preferencias: preferenciasSQL.length > 0 ? {
                tema: preferenciasSQL[0].tema,
                sidebarMinimizado: preferenciasMongo?.sidebarMinimizado || false,
                estado: preferenciasSQL[0].estado, // Asegurarse de que el estado se incluya
                fecha_creacion: preferenciasSQL[0].fecha_creacion, // Asegurarse de que la fecha de creación se incluya
                fecha_modificacion: preferenciasSQL[0].fecha_modificacion // Asegurarse de que la fecha de modificación se incluya
            } : null
        };
        
        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener usuario con preferencias:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ACTUALIZAR PREFERENCIAS (Usando SQL Directo)
usersCtl.updatePreferences = async (req, res) => {
    // Se usa req.user.id si la solicitud viene de un usuario logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idUsuario = req.user ? req.user.id : req.params.id; 
    const { tema, sidebarMinimizado } = req.body;
    try {
        // SQL directo para buscar preferencias
        const [preferenciasSQL] = await sql.promise().query("SELECT * FROM preferencias WHERE usuarioId = ?", [idUsuario]);
        
        if (preferenciasSQL.length === 0) {
            return res.status(404).json({ error: 'Preferencias no encontradas.' });
        }
        
        const preferenciaSQL = preferenciasSQL[0];
        const now = new Date().toISOString(); // Obtiene la fecha y hora actual para la modificación
        
        // SQL directo para actualizar tema
        await sql.promise().query("UPDATE preferencias SET tema = ?, fecha_modificacion = ? WHERE id = ?", [tema, now, preferenciaSQL.id]);
        
        // CORREGIDO: Se usa 'mongo.Preferencias' con mayúscula
        await mongo.Preferencias.updateOne(
            { idPreferenciaSql: preferenciaSQL.id },
            { $set: { sidebarMinimizado, fecha_modificacion: now } }
        );
        
        res.status(200).json({ message: 'Preferencias actualizadas.' });
    } catch (error) {
        console.error('Error al actualizar preferencias:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ELIMINAR PREFERENCIAS (Usando SQL Directo)
usersCtl.deletePreferences = async (req, res) => {
    // Se usa req.user.id si la solicitud viene de un usuario logueado para su propio perfil
    // De lo contrario, se usa req.params.id para buscar por ID (ej. por un administrador)
    const idUsuario = req.user ? req.user.id : req.params.id; 
    try {
        // SQL directo para buscar preferencias
        const [preferenciasSQL] = await sql.promise().query("SELECT * FROM preferencias WHERE usuarioId = ?", [idUsuario]);
        
        if (preferenciasSQL.length === 0) {
            return res.status(404).json({ error: 'Preferencias no encontradas.' });
        }
        
        const preferenciaSQL = preferenciasSQL[0];
        const now = new Date().toISOString(); // Obtiene la fecha y hora actual para la modificación
        
        // SQL directo para marcar como eliminado
        await sql.promise().query("UPDATE preferencias SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ?", [now, preferenciaSQL.id]);
        
        // CORREGIDO: Se usa 'mongo.Preferencias' con mayúscula
        await mongo.Preferencias.updateOne(
            { idPreferenciaSql: preferenciaSQL.id },
            { $set: { estado: 'eliminado', fecha_modificacion: now } }
        );
        
        res.status(200).json({ message: 'Preferencias marcadas como eliminadas.' });
    } catch (error) {
        console.error('Error al eliminar preferencias:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = usersCtl;
