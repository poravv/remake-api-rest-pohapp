/**
 * Configuraciones generales de la aplicación
 */

// Exportar las variables de entorno o valores predeterminados
module.exports = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Configuración de base de datos
    DB: {
        DATABASE: process.env.DB_DATABASE || 'db-pohapp',
        USER: process.env.DB_USER || 'root',
        PASSWORD: process.env.DB_PASSWORD || 'pohapp',
        HOST: process.env.DB_HOST || 'localhost',
        PORT: process.env.DB_PORT || 3306,
        DIALECT: 'mysql'
    },

    // Configuración de CORS
    CORS: {
        WHITELIST: [
            'http://localhost:3000',
            'https://pohapp-web.onrender.com'
        ]
    },

    // Configuración de seguridad
    SECURITY: {
        API_SIGNATURE_TTL: 5 * 60 * 1000 // 5 minutos en milisegundos
    }
};
