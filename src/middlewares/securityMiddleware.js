/**
 * Middleware de seguridad para verificar firmas de API
 */
const crypto = require('crypto');
const config = require('../config/config');

/**
 * Genera una firma HMAC para una petición a la API
 * @param {string} apiKey - Clave de API del cliente
 * @param {string} apiSecret - Secreto para firmar peticiones
 * @param {string} path - Ruta de la petición
 * @param {string|object} body - Cuerpo de la petición (para POST/PUT)
 * @param {number} timestamp - Timestamp UNIX en milisegundos
 * @returns {string} Firma hexadecimal
 */
function generateSignature(apiKey, apiSecret, path, body = '', timestamp) {
  // Asegurar que el timestamp esté en milisegundos
  timestamp = timestamp || Date.now();

  // Para objetos, convertir a JSON
  if (typeof body === 'object') {
    body = JSON.stringify(body);
  }

  // Crear mensaje para firmar
  const message = `${apiKey}${timestamp}${path}${body}`;

  // Crear firma HMAC
  const hmac = crypto.createHmac('sha256', apiSecret);
  hmac.update(message);
  return hmac.digest('hex');
}

/**
 * Verifica la firma de una petición
 * @param {Object} req - Objeto request de Express
 * @param {string} apiSecret - Secreto para verificar la firma
 * @returns {boolean} True si la firma es válida
 */
function verifySignature(req, apiSecret) {
  const apiKey = req.header('X-API-Key');
  const timestamp = parseInt(req.header('X-Timestamp'), 10);
  const signature = req.header('X-Signature');
  const path = req.originalUrl;
  const body = req.method === 'GET' ? '' : req.body;

  // Verificar que todos los valores están presentes
  if (!apiKey || !timestamp || !signature) {
    return false;
  }

  // Verificar que timestamp no está expirado (5 minutos)
  const now = Date.now();
  if (now - timestamp > config.SECURITY.API_SIGNATURE_TTL) {
    return false;
  }

  // Regenerar firma y comparar
  const expectedSignature = generateSignature(
    apiKey,
    apiSecret,
    path,
    body,
    timestamp
  );

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Middleware para verificar autenticación mediante firma HMAC
 */
const validateApiSignature = (apiSecret) => {
  return (req, res, next) => {
    if (!verifySignature(req, apiSecret)) {
      return res.status(401).json({
        status: 'error',
        message: 'Firma no válida o expirada'
      });
    }
    next();
  };
};

module.exports = {
  generateSignature,
  verifySignature,
  validateApiSignature
};
