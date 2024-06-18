const express = require('express')
const routes = express()
const dolencias = require('./routes/ruta_dolencias')
const planta = require('./routes/ruta_planta')
const autor = require('./routes/ruta_autor')
const usuario = require('./routes/ruta_usuario')
const poha = require('./routes/ruta_poha')
const puntos = require('./routes/ruta_puntos')
const dp = require('./routes/ruta_dolencias_poha')
const pp = require('./routes/ruta_poha_planta')
const medicinales = require('./routes/ruta_medicinales')


routes.use('/api/pohapp/dolencias',dolencias)
routes.use('/api/pohapp/planta',planta)
routes.use('/api/pohapp/autor',autor)
routes.use('/api/pohapp/usuario',usuario)
routes.use('/api/pohapp/poha',poha)
routes.use('/api/pohapp/puntos',puntos)
routes.use('/api/pohapp/dp',dp)
routes.use('/api/pohapp/pp',pp)
routes.use('/api/pohapp/medicinales',medicinales)

module.exports= routes;