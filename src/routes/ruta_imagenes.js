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
/**
 * @swagger
 * /api/pohapp/imagenes/signed:
 *   get:
 *     tags: [Imagenes]
 *     summary: Generar URL firmada temporal para una imagen MinIO
 *     parameters:
 *       - name: url
 *         in: query
 *         required: true
 *         schema: { type: string, format: uri }
 *         description: URL original (MinIO o externa).
 *       - name: expiry
 *         in: query
 *         required: false
 *         schema: { type: integer, default: 86400 }
 *         description: Segundos hasta la expiración (default 24h).
 *     responses:
 *       '200':
 *         description: URL firmada (o original si no es MinIO)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SignedUrl' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
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
/**
 * @swagger
 * /api/pohapp/imagenes/proxy/{path}:
 *   get:
 *     tags: [Imagenes]
 *     summary: Redirige a URL firmada temporal (307)
 *     parameters:
 *       - name: path
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: Ruta del objeto MinIO (soporta subdirectorios).
 *     responses:
 *       '307':
 *         description: Redirect a la URL firmada temporal
 *         headers:
 *           Location:
 *             schema: { type: string, format: uri }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
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
/**
 * @swagger
 * /api/pohapp/imagenes/info:
 *   get:
 *     tags: [Imagenes]
 *     summary: Inspeccionar URL (MinIO o externa) sin generar firma
 *     parameters:
 *       - name: url
 *         in: query
 *         required: true
 *         schema: { type: string, format: uri }
 *     responses:
 *       '200':
 *         description: Información de la URL
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ImageInfo' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
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
