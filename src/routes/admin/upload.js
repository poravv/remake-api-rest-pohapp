const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const auditMiddleware = require('../../middleware/auditMiddleware');
const rateLimitAdmin = require('../../middleware/rateLimitAdmin');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const minioService = require('../../services/minioService');

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_TYPES = new Set(['planta', 'usuario', 'generic']);
const SIGNED_URL_TTL_SEC = 15 * 60;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            const err = new Error('Tipo MIME no soportado');
            err.code = 'UNSUPPORTED_MEDIA_TYPE';
            return cb(err);
        }
        cb(null, true);
    },
});

router.use(verifyToken, requireAdmin, rateLimitAdmin);

/**
 * Build the MinIO object key from the requested prefix type, a yyyy/mm date
 * segment, a uuid and a sanitized original filename.
 */
function buildObjectKey(prefixType, originalName) {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const uuid = crypto.randomBytes(8).toString('hex');
    const base = path
        .basename(originalName || 'file')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .slice(0, 80);
    return `admin/${prefixType}/${yyyy}/${mm}/${uuid}-${base}`;
}

/**
 * POST /api/pohapp/admin/upload
 * Single-file multipart upload to MinIO. Returns a 15-min signed URL.
 */
router.post(
    '/',
    auditMiddleware('storage.upload'),
    (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (!err) return next();
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Archivo excede 10 MB' } });
            }
            if (err.code === 'UNSUPPORTED_MEDIA_TYPE') {
                return res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Solo se permiten imágenes JPEG, PNG o WebP' } });
            }
            return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message } });
        });
    },
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: { code: 'NO_FILE', message: 'Falta el archivo (campo "file")' } });
            }
            const requestedType = String(req.query.type || 'generic').toLowerCase();
            const prefixType = ALLOWED_TYPES.has(requestedType) ? requestedType : 'generic';
            const objectKey = buildObjectKey(prefixType, req.file.originalname);

            await minioService.minioClient.putObject(
                process.env.MINIO_BUCKET_NAME || 'bucket-pohapp',
                objectKey,
                req.file.buffer,
                req.file.buffer.length,
                { 'Content-Type': req.file.mimetype }
            );

            const signedUrl = await minioService.getPresignedUrl(objectKey, SIGNED_URL_TTL_SEC);
            const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SEC * 1000).toISOString();
            res.status(201).json({
                objectKey,
                url: signedUrl,
                expiresAt,
                contentType: req.file.mimetype,
                size: req.file.size,
            });
        } catch (err) {
            console.error('admin.upload error:', err);
            res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
        }
    }
);

module.exports = router;
module.exports.MAX_BYTES = MAX_BYTES;
module.exports.ALLOWED_MIME = ALLOWED_MIME;
