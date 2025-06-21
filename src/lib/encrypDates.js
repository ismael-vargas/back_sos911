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

// Función para cifrar datos
function cifrarDatos(datos) {
    try {
         // Convierte los datos en cadena JSON y los cifra usando AES y la clave secreta
        const cifrado = CryptoJS.AES.encrypt(JSON.stringify(datos), claveSecreta).toString();
         // Retorna la cadena cifrada
        return cifrado;
    } catch (error) {
         // Si hay un error durante el cifrado, lo muestra en consola y lo lanza
        console.error('Error al cifrar datos:', error.message);
        throw error;
    }
}

// Función para descifrar datos
function descifrarDatos(cifrado) {
    // Desencripta el texto cifrado usando la clave secreta
    try {
        const bytes = CryptoJS.AES.decrypt(cifrado, claveSecreta);
          // Convierte los bytes desencriptados a texto UTF-8 y luego a objeto JSON
        const datos = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        // Retorna los datos originales
        return datos;
    } catch (error) {
         // Si hay un error durante el descifrado, lo muestra en consola y lo lanza
        console.error('Error al descifrar datos:', error.message);
        throw error;
    }
}

// Exporta las funciones para que puedan ser usadas en otros archivos
module.exports = {
    cifrarDatos,
    descifrarDatos
}