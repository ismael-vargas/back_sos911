//Sirve para proteger rutas y permitir acceso solo a usuarios autenticados. (auth.js)
// Middleware para verificar si el usuario ha iniciado sesión 
const isLoggedIn = (req, res, next) => {
    // Verifica si el usuario está autenticado (función proporcionada por Passport.js)
    if (req.isAuthenticated()) {
         // Muestra en consola que el usuario sí está autenticado
        console.log('Usuario autenticado');
        // Continúa con el siguiente middleware o la ruta solicitada
        return next();
    }
      // Si el usuario no está autenticado:
    console.log('Usuario no autenticado, redirigiendo a inicio de sesión');
      // Guarda la URL original que el usuario estaba intentando visitar
    // Esto es útil para redirigirlo de vuelta después de iniciar sesión
    req.session.returnTo = req.originalUrl;
       // Redirige al usuario a la página de inicio (o login si ahí lo tienes)
    res.redirect('/');
}
// Exporta la función isLoggedIn para que pueda usarse en otras partes de la app (por ejemplo, en rutas protegidas)
module.exports = isLoggedIn;

