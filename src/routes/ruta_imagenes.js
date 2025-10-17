const express = require('express');
const router = express.Router();
const {
  getPresignedUrl,
  getPresignedUrls,
  extractObjectName,
  isMinioUrl,
} = require('../services/minioService');

/**
 * GET /imagenes/signed
 * Genera URL firmada para una imagen específica
 * Query params:
 *   - url: URL original de MinIO
 *   - expiry: Tiempo de expiración en segundos (opcional, default: 86400 = 24h)
 */
router.get('/signed', async (req, res) => {
  try {
    const { url, expiry } = req.query;

    if (!url) {
      return res.status(400).json({
        error: 'URL requerida',
        message: 'Debes proporcionar el parámetro "url"',
      });
    }

    if (!isMinioUrl(url)) {
      // Si no es una URL de MinIO, devolverla sin cambios
      return res.json({
        original: url,
        signed: url,
        isMinioUrl: false,
      });
    }

    const objectName = extractObjectName(url);
    const expirySeconds = expiry ? parseInt(expiry) : 86400; // 24 horas por defecto
    const signedUrl = await getPresignedUrl(objectName, expirySeconds);

    res.json({
      original: url,
      signed: signedUrl,
      objectName,
      expiresIn: expirySeconds,
      isMinioUrl: true,
    });
  } catch (error) {
    console.error('❌ Error generando URL firmada:', error);
    res.status(500).json({
      error: 'Error generando URL firmada',
      message: error.message,
    });
  }
});

/**
 * POST /imagenes/signed-batch
 * Genera URLs firmadas para múltiples imágenes
 * Body:
 *   - urls: Array de URLs de MinIO
 *   - expiry: Tiempo de expiración en segundos (opcional)
 */
router.post('/signed-batch', async (req, res) => {
  try {
    const { urls, expiry } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        error: 'URLs requeridas',
        message: 'Debes proporcionar un array de URLs en el body',
      });
    }

    const expirySeconds = expiry ? parseInt(expiry) : 86400;
    const results = await getPresignedUrls(urls, expirySeconds);

    const successful = results.filter(r => r.signed !== null);
    const failed = results.filter(r => r.signed === null);

    res.json({
      total: urls.length,
      successful: successful.length,
      failed: failed.length,
      results,
      expiresIn: expirySeconds,
    });
  } catch (error) {
    console.error('❌ Error generando URLs firmadas batch:', error);
    res.status(500).json({
      error: 'Error generando URLs firmadas',
      message: error.message,
    });
  }
});

/**
 * GET /imagenes/proxy/:objectName
 * Redirige a una URL firmada temporal
 * Útil para usar en <img src="/api/imagenes/proxy/1000001009.jpg">
 */
router.get('/proxy/*', async (req, res) => {
  try {
    const objectName = req.params[0]; // Captura todo después de /proxy/

    if (!objectName) {
      return res.status(400).json({
        error: 'Nombre de objeto requerido',
      });
    }

    const signedUrl = await getPresignedUrl(objectName);
    
    // Redirigir a la URL firmada
    res.redirect(307, signedUrl);
  } catch (error) {
    console.error('❌ Error en proxy de imagen:', error);
    res.status(500).json({
      error: 'Error obteniendo imagen',
      message: error.message,
    });
  }
});

/**
 * GET /imagenes/info
 * Obtiene información sobre una URL de MinIO sin generar firma
 */
router.get('/info', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: 'URL requerida',
      });
    }

    const isMinioImage = isMinioUrl(url);
    const objectName = isMinioImage ? extractObjectName(url) : null;

    res.json({
      url,
      isMinioUrl: isMinioImage,
      objectName,
      needsSigning: isMinioImage,
    });
  } catch (error) {
    console.error('❌ Error obteniendo info de imagen:', error);
    res.status(500).json({
      error: 'Error obteniendo información',
      message: error.message,
    });
  }
});

module.exports = router;
