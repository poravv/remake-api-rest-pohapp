require('dotenv').config();
const express = require('express');
const app = express();
const database = require('./database');
const rutas = require('./config_rutas');
const port = process.env.PORT || 3000;
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { initRedis, isRedisReady, hasRedisConfig } = require('./services/cacheClient');

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors());/*aplica permiso para todos los origenes*/

app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX || '120', 10);
const generalLimiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/pohapp', generalLimiter);

/*Filtramos los origenes que se pueden conectar*/
//const siteList = ['http://localhost:3000','https://pohapp-web.onrender.com/']
//app.use(cors({origin:siteList}));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const conecta = async () => {
    const maxRetries = parseInt(process.env.DB_CONNECT_RETRIES || '20', 10);
    const delayMs = parseInt(process.env.DB_CONNECT_DELAY_MS || '2000', 10);
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
            await database.authenticate();
            console.log("Base de datos conectada");
            return true;
        } catch (error) {
            console.log(`⏳ DB no lista (intento ${attempt}/${maxRetries}): ${error.message}`);
            if (attempt === maxRetries) {
                console.log("❌ No se pudo conectar a la base de datos");
                return false;
            }
            await sleep(delayMs);
        }
    }
    return false;
}

conecta().catch((error) => {
    console.log("❌ Error inesperado al conectar DB:", error);
});
initRedis();
//Manejador de errores

app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(express.json({ limit: '50mb', extended: true, parameterLimit: 500000 }));

// Health check endpoints (deben estar ANTES de las rutas)
app.get('/', (_req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Api rest Poha ÑanApp',
        timestamp: new Date().toISOString()
    })
})

app.get('/health', (_req, res) => {
    res.status(200).json({ 
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    })
})

app.get('/readiness', (_req, res) => {
    // Verificar conexión a la base de datos
    database.authenticate()
        .then(() => {
            const redisStatus = hasRedisConfig()
              ? (isRedisReady() ? 'connected' : 'disconnected')
              : 'disabled';
            res.status(200).json({ 
                status: 'ready',
                database: 'connected',
                redis: redisStatus,
                timestamp: new Date().toISOString()
            })
        })
        .catch((error) => {
            const redisStatus = hasRedisConfig()
              ? (isRedisReady() ? 'connected' : 'disconnected')
              : 'disabled';
            res.status(503).json({ 
                status: 'not ready',
                database: 'disconnected',
                redis: redisStatus,
                error: error.message
            })
        })
})

app.use(rutas)

// Manejador de errores centralizado
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('❌ Error no controlado:', err);
    res.status(err.status || 500).json({
        error: 'Error interno del servidor',
        message: err.message || 'Error desconocido',
    });
});

app.listen(port, () => {
    console.log("App corriendo en el puerto: ", port)
})
