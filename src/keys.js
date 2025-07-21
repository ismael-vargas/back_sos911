// keys.js
const MYSQLHOST = '31.97.42.126';
const MYSQLUSER = 'linkear';
const MYSQLPASSWORD = '0987021692@Rj';
const MYSQLDATABASE = 'sos911';
const MYSQLPORT = '3306';
const MYSQL_URI = process.env.MYSQL_URI ?? '';
const MONGO_URI = 'mongodb://linkear:0987021692%40Rj@31.97.42.126:27017/sos911?authSource=sos911';

module.exports = {
    MYSQLHOST,
    MYSQLUSER,
    MYSQLPASSWORD,
    MYSQLDATABASE,
    MYSQLPORT,
    MYSQL_URI,
    MONGO_URI,
};