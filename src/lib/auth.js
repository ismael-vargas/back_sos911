const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        console.log('Usuario autenticado');
        return next();
    }
    console.log('Usuario no autenticado, redirigiendo a inicio de sesión');
    req.session.returnTo = req.originalUrl;
    res.redirect('/');
}

module.exports = isLoggedIn;
