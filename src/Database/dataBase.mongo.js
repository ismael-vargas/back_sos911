// Importamos mongoose
const mongoose = require('mongoose');
// Importamos la URI de conexión a MongoDB desde el archivo central de configuración (keys.js)
const { MONGO_URI } = require('../keys'); 
// Definimos una función asíncrona para establecer la conexión con MongoDB
const connectMongoDB = async () => {
    try {  // Intentamos conectarnos a MongoDB usando la URI y algunas opciones recomendadas
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,  // Usa el nuevo parser de URLs de MongoDB 
            useUnifiedTopology: true,   // Usa el nuevo motor de gestión de conexiones de MongoDB
        });
         // Si la conexión es exitosa, mostramos un mensaje en consola
        console.log('Conexión exitosa a MongoDB Atlas');
    } catch (error) {
         // Si ocurre un error durante la conexión, mostramos el mensaje de error
        console.error('Error al conectar a MongoDB Atlas:', error.message);
         // Terminamos la ejecución de la app con un código de error (1)
        process.exit(1);
    }
};

module.exports = connectMongoDB;