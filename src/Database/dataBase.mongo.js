// Importamos mongoose
const mongoose = require('mongoose');
// Importamos la variable MONGO_URI desde keys.js
const { MONGO_URI } = require('../keys'); 

const connectMongoDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
         // Si la conexión es exitosa, mostramos un mensaje en consola
        console.log('Conexión exitosa a MongoDB');
    } catch (error) {
         // Si ocurre un error al intentar conectarse, lo capturamos y mostramos el mensaje
        console.error('Error al conectar a MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectMongoDB;