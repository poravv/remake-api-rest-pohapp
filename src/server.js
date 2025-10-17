const express = require('express');
const app = express();
const database = require('./database');
const rutas = require('./config_rutas');
const port = process.env.PORT || 3000;
const cors = require('cors');

app.use(cors());/*aplica permiso para todos los origenes*/

/*Filtramos los origenes que se pueden conectar*/
//const siteList = ['http://localhost:3000','https://pohapp-web.onrender.com/']
//app.use(cors({origin:siteList}));

const conecta = async () => {
    try {
        database.authenticate()
        console.log("Base de datos conectada");
    } catch (error) {
        console.log("Error: ", error)
    }
}

conecta();
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
            res.status(200).json({ 
                status: 'ready',
                database: 'connected',
                timestamp: new Date().toISOString()
            })
        })
        .catch((error) => {
            res.status(503).json({ 
                status: 'not ready',
                database: 'disconnected',
                error: error.message
            })
        })
})

app.use(rutas)

app.listen(port, () => {
    console.log("App corriendo en el puerto: ", port)
})