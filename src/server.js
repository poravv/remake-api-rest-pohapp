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
const { initRedis, isRedisReady, hasRedisConfig, getRedisClient } = require('./services/cacheClient');
const { errorHandler } = require('./middleware/errorHandler');
const { activityLog } = require('./middleware/activityLog');

app.disable('x-powered-by');
app.set('trust proxy', 1);

// CORS allow-list driven by CORS_ALLOWED_ORIGINS (comma-separated).
// In production we refuse to default to a permissive policy but we do not
// block boot: log a prominent warning instead so ops can react without an
// outage. In development, absence of the env keeps the current permissive
// behavior to avoid breaking local workflows.
const corsOrigins = process.env.CORS_ALLOWED_ORIGINS;
if (corsOrigins) {
    const allowedOrigins = corsOrigins.split(',').map((o) => o.trim()).filter(Boolean);
    app.use(cors({ origin: allowedOrigins, credentials: true }));
} else if (process.env.NODE_ENV === 'production') {
    console.warn(
        '[CORS][WARN] CORS_ALLOWED_ORIGINS no esta definido en produccion. ' +
            'Configura la lista explicita de origenes permitidos.'
    );
    app.use(cors({ origin: false }));
} else {
    app.use(cors());
}

app.use(helmet({
    contentSecurityPolicy: false,
    // API serves resources to cross-origin clients (admin web + MinIO redirects).
    // Default 'same-origin' causes ERR_BLOCKED_BY_RESPONSE.NotSameOrigin in the
    // browser when <img> tries to load /imagenes/proxy/* from another origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
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
app.use(activityLog);

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

app.get('/readiness', (req, res) => {
    // Durante el apagado el pod deja de estar listo: evita recibir trafico
    // nuevo mientras drena las requests en curso.
    if (req.app.get('cerrando')) {
        return res.status(503).json({ status: 'shutting down' });
    }
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

app.use(errorHandler);

const server = app.listen(port, () => {
    console.log("App corriendo en el puerto: ", port)
})

/**
 * Apagado ordenado. Kubernetes manda SIGTERM en cada rollout: sin manejarlo el
 * proceso muere de golpe, cortando las requests en vuelo y dejando las
 * conexiones a MySQL y Redis sin cerrar.
 *
 * El timeout es la red de seguridad: si una conexion queda colgada, se sale
 * igual en lugar de esperar el SIGKILL del cluster.
 */
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);
// server.close() resuelve cuando se cierran los sockets, pero un handler async
// puede seguir corriendo si el cliente movil corto la conexion. Este margen le
// da tiempo a terminar antes de cerrar MySQL y Redis bajo sus pies.
const DRAIN_MS = parseInt(process.env.SHUTDOWN_DRAIN_MS || '2000', 10);
let cerrando = false;

async function apagadoOrdenado(senal) {
    if (cerrando) return;
    cerrando = true;
    app.set('cerrando', true);
    console.log(`[SHUTDOWN] ${senal} recibido, cerrando ordenadamente`);

    const forzarSalida = setTimeout(() => {
        console.error('[SHUTDOWN] timeout alcanzado, salida forzada');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forzarSalida.unref();

    try {
        await new Promise((resolve) => {
            server.close(resolve);
            // Las conexiones keep-alive ociosas impiden que close() resuelva.
            if (typeof server.closeIdleConnections === 'function') {
                server.closeIdleConnections();
            }
        });
        console.log('[SHUTDOWN] servidor HTTP cerrado');
    } catch (error) {
        console.error('[SHUTDOWN] error cerrando HTTP:', error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, DRAIN_MS));

    // Los cierres de infraestructura no deben impedir la salida: se registran
    // y se continua.
    try {
        const redis = getRedisClient();
        // isOpen/isReady son del cliente: el flag propio no se restablece tras
        // una reconexion y dejaria la conexion sin cerrar.
        if (redis?.isReady) {
            await redis.quit();
            console.log('[SHUTDOWN] Redis cerrado');
        } else if (redis?.isOpen) {
            await redis.disconnect();
            console.log('[SHUTDOWN] Redis desconectado');
        }
    } catch (error) {
        console.error('[SHUTDOWN] error cerrando Redis:', error.message);
    }

    try {
        await database.close();
        console.log('[SHUTDOWN] base de datos cerrada');
    } catch (error) {
        console.error('[SHUTDOWN] error cerrando base de datos:', error.message);
    }

    clearTimeout(forzarSalida);
    console.log('[SHUTDOWN] proceso finalizado');
    process.exit(0);
}

process.on('SIGTERM', () => apagadoOrdenado('SIGTERM'));
process.on('SIGINT', () => apagadoOrdenado('SIGINT'));
