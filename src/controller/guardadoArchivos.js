const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
app.use(cookieParser());
app.use(csrf({ cookie: true }));

const guardadoImgenCtl = {}

guardadoImgenCtl.sendTeacher = (req, res) => {
    // Verificar que se recibió un archivo
    if (!req.files || !req.files.image) {
        return res.status(400).send('No se recibió ningún archivo');
    }

    // Obtener la imagen cargada
    const imageFile = req.files.image;

    // Crear el filePath donde se guardará la imagen
    const filePath = __dirname + '/../public/img/usuario/' + imageFile.name;

    // Guardar la imagen en el filePath
    imageFile.mv(filePath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al guardar la imagen');
        }

        // Enviar una respuesta satisfactoria al servidor A
        res.send('Imagen guardada exitosamente!');
    });
}

guardadoImgenCtl.sendArchivos = (req, res) => {
    // Verificar que se recibió un archivo
    if (!req.files || !req.files.image) {
        return res.status(400).send('No se recibió ningún archivo');
    }

    // Obtener la imagen cargada
    const imageFile = req.files.image;

    // Crear el filePath donde se guardará la imagen
    const filePath = __dirname + '/../public/archivos/teacher/' + imageFile.name;

    // Guardar la imagen en el filePath
    imageFile.mv(filePath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al guardar la imagen');
        }

        // Enviar una respuesta satisfactoria al servidor A
        res.send('Imagen guardada exitosamente!');
    });
}

guardadoImgenCtl.sendEstudent = (req, res) => {
    // Verificar que se recibió un archivo
    if (!req.files || !req.files.image) {
        return res.status(400).send('No se recibió ningún archivo');
    }

    // Obtener la imagen cargada
    const imageFile = req.files.image;

    // Crear el filePath donde se guardará la imagen
    const filePath = __dirname + '/../public/img/usuario/' + imageFile.name;

    // Guardar la imagen en el filePath
    imageFile.mv(filePath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al guardar la imagen');
        }

        // Enviar una respuesta satisfactoria al servidor A
        res.send('Imagen guardada exitosamente!');
    });
}

module.exports = guardadoImgenCtl