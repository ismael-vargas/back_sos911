// keys.js
const MYSQLHOST = '31.97.42.126';
const MYSQLUSER = 'linkear';
const MYSQLPASSWORD = '0987021692@Rj';
const MYSQLDATABASE = 'sos911';
const MYSQLPORT = '3306';
const MYSQL_URI = process.env.MYSQL_URI ?? '';

const MONGO_URI = 'mongodb://localhost:27017/sos_mongo';

// Nueva clave para cifrado (debe ser de 32 caracteres)


module.exports = {
    MYSQLHOST,
    MYSQLUSER,
    MYSQLPASSWORD,
    MYSQLDATABASE,
    MYSQLPORT,
    MYSQL_URI,
    MONGO_URI,
};