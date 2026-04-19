/**
 * Integration tests for POST /api/pohapp/admin/upload.
 */

const request = require('supertest');
const express = require('express');

jest.mock('../../src/middleware/auth', () => ({
    verifyToken: (req, _res, next) => {
        req.user = { uid: 'admin-uid', email: 'admin@test.com', isAdmin: 1 };
        next();
    },
    requireAdmin: (_req, _res, next) => next(),
    optionalAuth: (_req, _res, next) => next(),
}));

jest.mock('../../src/services/auditLogService', () => ({
    log: jest.fn().mockResolvedValue({ id: 1 }),
    sanitizePayload: (v) => v,
    SENSITIVE_KEYS: new Set(),
}));

const mockMinioClient = {
    putObject: jest.fn().mockResolvedValue({ etag: 'xyz' }),
};
jest.mock('../../src/services/minioService', () => ({
    minioClient: mockMinioClient,
    getPresignedUrl: jest.fn().mockResolvedValue('https://minio.test/signed'),
}));

const uploadRouter = require('../../src/routes/admin/upload');

function buildApp() {
    const app = express();
    app.use('/api/pohapp/admin/upload', uploadRouter);
    return app;
}

describe('admin/upload router', () => {
    let app;
    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
    });

    it('accepts a PNG upload and returns a signed URL', async () => {
        const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const res = await request(app)
            .post('/api/pohapp/admin/upload?type=planta')
            .attach('file', pngBuffer, { filename: 'leaf.png', contentType: 'image/png' });

        expect(res.status).toBe(201);
        expect(res.body.objectKey).toMatch(/^admin\/planta\//);
        expect(res.body.url).toBe('https://minio.test/signed');
        expect(res.body.contentType).toBe('image/png');
        expect(mockMinioClient.putObject).toHaveBeenCalled();
    });

    it('rejects unsupported MIME with 415', async () => {
        const exeBuffer = Buffer.from('MZ not a real exe');
        const res = await request(app)
            .post('/api/pohapp/admin/upload')
            .attach('file', exeBuffer, { filename: 'virus.exe', contentType: 'application/octet-stream' });
        expect(res.status).toBe(415);
        expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('rejects over-10MB files with 413', async () => {
        const big = Buffer.alloc(11 * 1024 * 1024, 0);
        const res = await request(app)
            .post('/api/pohapp/admin/upload')
            .attach('file', big, { filename: 'big.jpg', contentType: 'image/jpeg' });
        expect(res.status).toBe(413);
        expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('returns 400 when no file attached', async () => {
        const res = await request(app).post('/api/pohapp/admin/upload');
        expect(res.status).toBe(400);
    });
});
