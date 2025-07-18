// Cifra y descifra datos con AES y crypto-js.(encrypDates.js)
const CryptoJS = require('crypto-js');
const dotenv = require('dotenv');

dotenv.config();
// Define la clave secreta para el cifrado y descifrado
// Si no existe en las variables de entorno, usa una clave por defecto
const claveSecreta = process.env.CLAVE_SECRETA || 'cifrarqR7#'; // clave lista

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