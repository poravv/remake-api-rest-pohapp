/**
 * Configuración principal de la aplicación Express
 */
const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');


// Importación del enrutador principal
const routes = require('./routes/index');


// Inicialización de la aplicación Express
const app = express();
app.use(express.json());


// Configuración de CORS
if (process.env.NODE_ENV === 'production') {
    app.use(cors({ origin: config.CORS.WHITELIST }));
} else {
    app.use(cors()); // En desarrollo, permite todos los orígenes
}

// Configuración para parsear JSON y URL encoded
app.use(express.json({ limit: '50mb', extended: true, parameterLimit: 500000 }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Ruta de diagnóstico/salud
app.get('/', (_req, res) => {
    res.send("API REST Poha ÑanApp - Versión " + require('../package.json').version);
});

// Ruta de diagnóstico adicional para verificar el estado de los modelos
app.get('/api/status', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        message: 'El servidor está en funcionamiento',
        version: require('../package.json').version
    });
});

// Configuración de rutas API centralizadas
app.use(routes);
// Middleware para manejar rutas no encontradas
app.use(notFound);

// Middleware para manejar errores
app.use(errorHandler);

module.exports = app;
