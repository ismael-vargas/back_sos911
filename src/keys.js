const MYSQLHOST = '31.97.42.126';
const MYSQLUSER = 'linkear';
const MYSQLPASSWORD = '0987021692@Rj';
const MYSQLDATABASE = 'sos911';
const MYSQLPORT = '3306'; // Puerto de la base de datos
const MYSQL_URI = process.env.MYSQL_URI ?? ''; // URI de conexión a la base de datos MySQL

// Configuración de MongoDB local
const MONGO_URI = 'mongodb://localhost:27017/sos_mongo';


// Exportar las variables de configuración
module.exports = {
    MYSQLHOST,
    MYSQLUSER,
    MYSQLPASSWORD,
    MYSQLDATABASE,
    MYSQLPORT,
    MYSQL_URI,
    MONGO_URI // Agregamos la URI de MongoDB
};