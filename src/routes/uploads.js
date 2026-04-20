const express = require('express');
const crypto = require('crypto');
const { verifyToken } = require('../middleware/auth');
const { getPresignedPutUrl } = require('../services/minioService');

const router = express.Router();

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function inferExtension(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * POST /api/pohapp/uploads/sign
 * Devuelve una URL firmada PUT para que el cliente suba directo a MinIO,
 * evitando proxyear el archivo por el backend. El cliente envía un PUT
 * con el Content-Type que declaró y sin headers extra.
 *
 * Request:
 *   { contentType: 'image/jpeg'|'image/png'|'image/webp',
 *     size: number (bytes, opcional pero recomendado),
 *     folder: 'aporte'|'perfil' (opcional; default 'aporte') }
 * Response:
 *   { url, key, expiresIn, publicProxyUrl }
 *
 * publicProxyUrl es la ruta proxy del backend que el cliente guarda en
 * planta.img / poha asociado, para que después resuelva con firma
 * fresca vía /imagenes/proxy/*.
 */
router.post('/sign', verifyToken, async (req, res) => {
  try {
    const contentType = String(req.body?.contentType || '').toLowerCase();
    const size = Number(req.body?.size || 0);
    const folder = ['aporte', 'perfil'].includes(req.body?.folder)
      ? req.body.folder
      : 'aporte';

    if (!ALLOWED_MIMES.has(contentType)) {
      return res.status(400).json({
        error: 'contentType no permitido',
        allowed: Array.from(ALLOWED_MIMES),
      });
    }
    if (size && size > MAX_SIZE_BYTES) {
      return res.status(400).json({
        error: `size excede el máximo de ${MAX_SIZE_BYTES} bytes`,
      });
    }

    const uid = req.user?.uid || 'anon';
    const ext = inferExtension(contentType);
    const uuid = crypto.randomUUID();
    const key = `${folder}/u-${uid}/${Date.now()}-${uuid}.${ext}`;
    const expiresIn = 900; // 15 min
    const url = await getPresignedPutUrl(key, expiresIn);

    res.json({
      url,
      key,
      expiresIn,
      contentType,
      publicProxyUrl: `/api/pohapp/imagenes/proxy/${encodeURIComponent(key)}`,
    });
  } catch (error) {
    console.error('Error firmando upload:', error);
    res.status(500).json({ error: 'No pudimos firmar la subida' });
  }
});

module.exports = router;
