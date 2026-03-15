const express = require('express');
const router = express.Router();
const {
  getPresignedUrl,
  getPresignedUrls,
  extractObjectName,
  isMinioUrl,
} = require('../services/minioService');
const {
  validateSignedUrl,
  validateSignedBatch,
  validateInfoUrl,
} = require('../middleware/validation/imagenes.validation');

/**
 * GET /imagenes/signed
 * Genera URL firmada para una imagen especifica
 */
router.get('/signed', validateSignedUrl, async (req, res) => {
  try {
    const { url, expiry } = req.query;

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
    console.error('Error generando URL firmada:', error);
    res.status(500).json({
      error: 'Error generando URL firmada',
      message: error.message,
    });
  }
});

/**
 * POST /imagenes/signed-batch
 * Genera URLs firmadas para multiples imagenes
 */
router.post('/signed-batch', validateSignedBatch, async (req, res) => {
  try {
    const { urls, expiry } = req.body;

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
    console.error('Error generando URLs firmadas batch:', error);
    res.status(500).json({
      error: 'Error generando URLs firmadas',
      message: error.message,
    });
  }
});

/**
 * GET /imagenes/proxy/:objectName
 * Redirige a una URL firmada temporal
 */
router.get('/proxy/*', async (req, res) => {
  try {
    const objectName = req.params[0]; // Captura todo despues de /proxy/

    if (!objectName) {
      return res.status(400).json({
        error: 'Nombre de objeto requerido',
      });
    }

    const signedUrl = await getPresignedUrl(objectName);

    // Redirigir a la URL firmada
    res.redirect(307, signedUrl);
  } catch (error) {
    console.error('Error en proxy de imagen:', error);
    res.status(500).json({
      error: 'Error obteniendo imagen',
      message: error.message,
    });
  }
});

/**
 * GET /imagenes/info
 * Obtiene informacion sobre una URL de MinIO sin generar firma
 */
router.get('/info', validateInfoUrl, async (req, res) => {
  try {
    const { url } = req.query;

    const isMinioImage = isMinioUrl(url);
    const objectName = isMinioImage ? extractObjectName(url) : null;

    res.json({
      url,
      isMinioUrl: isMinioImage,
      objectName,
      needsSigning: isMinioImage,
    });
  } catch (error) {
    console.error('Error obteniendo info de imagen:', error);
    res.status(500).json({
      error: 'Error obteniendo informacion',
      message: error.message,
    });
  }
});

module.exports = router;
