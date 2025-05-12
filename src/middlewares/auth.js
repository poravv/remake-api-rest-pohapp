/**
 * Middleware de verificación para las rutas
 */

/**
 * Middleware para verificar si un usuario tiene permisos de admin
 */
const requireAdmin = async (req, res, next) => {
  try {
    const { Usuario } = require('../models');
    const idusuario = req.headers['user-id']; // O desde el token si se implementa autenticación
    
    if (!idusuario) {
      return res.status(401).json({
        error: 'Se requiere autenticación'
      });
    }
    
    const usuario = await Usuario.findByPk(idusuario);
    
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }
    
    if (usuario.isAdmin !== 1) {
      return res.status(403).json({
        error: 'No tiene permisos para esta acción'
      });
    }
    
    // Si llegamos aquí, el usuario es admin
    next();
  } catch (error) {
    console.error('Error en verificación de admin:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware para manejar errores de forma consistente
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error en la aplicación:', err);
  
  // Determinar el código de error
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  // Construir respuesta de error
  const response = {
    mensaje: err.message || 'Error interno del servidor',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  };
  
  // Enviar respuesta
  res.status(statusCode).json(response);
};

/**
 * Middleware para rutas no encontradas
 */
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = {
  requireAdmin,
  errorHandler,
  notFound
};
