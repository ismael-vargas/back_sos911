// Cifra y descifra datos con AES y crypto-js.(encrypDates.js)

// Importa la biblioteca crypto-js para usar algoritmos de cifrado
const CryptoJS = require('crypto-js');
// Importa dotenv para poder leer variables de entorno
const dotenv = require('dotenv');
// Carga las variables de entorno definidas en el archivo
dotenv.config();
// Define la clave secreta para el cifrado y descifrado
// Si no existe en las variables de entorno, usa una clave por defecto
const claveSecreta = process.env.CLAVE_SECRETA || 'una_clave_secreta_fuerte_y_unica';

// Cifra un string
function cifrarDato(texto) {
    try {
        return CryptoJS.AES.encrypt(texto, claveSecreta).toString();
    } catch (error) {
        console.error('Error al cifrar dato:', error.message);
        throw error;
    }
}

// Descifra un string
function descifrarDato(cifrado) {
    try {
        const bytes = CryptoJS.AES.decrypt(cifrado, claveSecreta);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Error al descifrar dato:', error.message);
        throw error;
    }
}

module.exports = {
    cifrarDato,
    descifrarDato
};