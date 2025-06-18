/**
 * Configuración principal de la aplicación Express
 */
const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

// Importación del enrutador principal
const routes = require('./routes/index');

// Inicializar modelos de IA al arrancar la aplicación
const { initModels } = require('./utils/validators');
console.log('🚀 Inicializando modelos de IA al arrancar la aplicación...');
initModels().then(() => {
    console.log('🎯 Modelos de IA listos para usar');
}).catch(error => {
    console.error('❌ Error al inicializar modelos de IA:', error.message);
    console.log('📋 La aplicación continuará con simulaciones');
});

// Inicialización de la aplicación Express
const app = express();

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
