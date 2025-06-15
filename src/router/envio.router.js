const express = require("express");
const router = express.Router()

const {isLoggedIn} = require('../lib/auth')
const { sendTeacher, sendArchivos, sendEstudent } = require('../controller/guardadoArchivos')

router.post('/imagenTeacher', sendTeacher)
router.post('/archivosTeacher', sendArchivos)
router.post('/imagenEstudiante', sendEstudent)

module.exports = router