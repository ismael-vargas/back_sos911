//Sirve para cifrar y verificar contraseñas de forma segura con bcrypt.

// Importa la librería bcrypt para cifrar y comparar contraseñas
const bcrypt = require('bcrypt');

const helpers = {};

// Función para cifrar una contraseña de forma segura
helpers.hashPassword = async (password) => {
    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        throw new Error('Error al cifrar la contraseña');
    }
};
// Función para comparar una contraseña ingresada con su versión cifrada

helpers.comparePassword = async (password, hashedPassword) => {
    try {
        const match = await bcrypt.compare(password, hashedPassword);
        return match;
    } catch (error) {
        throw new Error('Error al comparar contraseñas');
    }
};

// Exporta el objeto helpers para que estas funciones puedan usarse en otros archivos
module.exports = helpers;
