/**
 * Global error-handling middleware.
 * Must be registered as the LAST app.use() in server.js.
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : (err.message || 'Error desconocido'),
  });
};

module.exports = { errorHandler };
