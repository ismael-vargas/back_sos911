const user = (sequelize, type) => {
    return sequelize.define('users', {
        idUser: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            comment: 'Campo unico de usuario'
        },
        photoUser: {
            type: type.STRING,
            comment: 'Foto de usuario'
        },
        completeNameUser: {
            type: type.STRING,
            comment: 'Nombre completo de usuario'
        },
        identificationCardUser: {
            type: type.STRING,
            comment: 'Cedula de usuario'
        },
        emailUser: {
            type: type.STRING,
            comment: 'correo de usuario'
        }, 
        cellPhoneUser: {
            type: type.STRING,
            comment: 'Celular de usuario'
        },
        usernameUser: {
            type: type.STRING,
            comment: 'sobre nombre de usuario'
        },
        passwordUser: {
            type: type.STRING,
            comment: 'contraseña de usuario'
        },
        rolUser:{
            type: type.STRING,
            comment: 'rolde usuario'
        },
        stateUser: {
            type: type.STRING,
            comment: 'estado de usuario'
        },
        createUser: {
            type: type.STRING,
            comment: 'crear de usuario'
        },
        updateUser: {
            type: type.STRING,
            comment: 'actuazlizar de usuario'
        },
    }, {
        timestamps: false,
        comment: 'Tabla de usuarios'
    })
}

module.exports = user