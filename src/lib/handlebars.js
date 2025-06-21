//Sirve para formatear fechas en tiempo relativo con timeago.js.(handlebars.js)

// Importa la librería timeago.js, que sirve para convertir fechas en formatos tipo "hace 2 minutos"
const timeago = require('timeago.js');
// Crea un objeto helpers para agrupar funciones auxiliares
const helpers = {};
// Define una función que convierte una fecha a formato "hace X tiempo"
helpers.formatTimeAgo = (savedTimestamp) => {
    return timeago.format(savedTimestamp);
};
// Exporta el objeto helpers para que pueda usarse en otros archivos
module.exports = helpers;