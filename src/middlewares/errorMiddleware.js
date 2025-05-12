/**
 * Middleware para manejar errores en la aplicación
 */

// Manejo de errores 404 (ruta no encontrada)
const notFound = (req, res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Manejo de errores generales
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    console.error(`Error: ${err.message}`);

    res.status(statusCode).json({
        status: 'error',
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
    });
};

module.exports = {
    notFound,
    errorHandler
};
