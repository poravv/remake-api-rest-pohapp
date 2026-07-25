/**
 * Integration tests for POST /api/pohapp/admin/bulk/approve.
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

jest.mock('../../src/database', () => {
    const mockTx = {
        commit: jest.fn().mockResolvedValue(null),
        rollback: jest.fn().mockResolvedValue(null),
    };
    return {
        __mockTx: mockTx,
        transaction: jest.fn().mockResolvedValue(mockTx),
        query: jest.fn().mockResolvedValue([[]]),
        authenticate: jest.fn().mockResolvedValue(true),
        define: jest.fn(() => ({
            update: jest.fn().mockResolvedValue([1]),
            findAll: jest.fn().mockResolvedValue([]),
            findByPk: jest.fn().mockResolvedValue(null),
            findOne: jest.fn().mockResolvedValue(null),
            count: jest.fn().mockResolvedValue(0),
            destroy: jest.fn().mockResolvedValue(0),
            hasOne: jest.fn(),
            hasMany: jest.fn(),
            belongsTo: jest.fn(),
        })),
    };
});

const mockModerate = jest.fn().mockResolvedValue({ status: 'allowed' });
jest.mock('../../src/services/contentModerationService', () => ({
    moderateActivation: mockModerate,
}));

jest.mock('../../src/services/embeddingRegenService', () => ({
    regenerateEmbeddingsForPlanta: jest.fn().mockResolvedValue({ status: 'ok' }),
    regenerateEmbeddingsForDolencia: jest.fn().mockResolvedValue({ status: 'ok' }),
    regenerateEmbeddingForPoha: jest.fn().mockResolvedValue({ status: 'ok' }),
}));

const sequelizeMock = require('../../src/database');
const fakeTransaction = sequelizeMock.__mockTx;

const planta = require('../../src/model/planta');
const poha = require('../../src/model/poha');
const dolencias = require('../../src/model/dolencias');

const bulkRouter = require('../../src/routes/admin/bulk');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/pohapp/admin/bulk', bulkRouter);
    return app;
}

describe('admin/bulk router', () => {
    let app;
    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
    });

    it('422 when body is empty', async () => {
        const res = await request(app).post('/api/pohapp/admin/bulk/approve').send({});
        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('422 when type is unknown', async () => {
        const res = await request(app)
            .post('/api/pohapp/admin/bulk/approve')
            .send({ type: 'unicorn', ids: [1] });
        expect(res.status).toBe(422);
    });

    it('422 when ids is empty', async () => {
        const res = await request(app)
            .post('/api/pohapp/admin/bulk/approve')
            .send({ type: 'planta', ids: [] });
        expect(res.status).toBe(422);
    });

    it('422 when batch > 200', async () => {
        const ids = Array.from({ length: 201 }, (_, i) => i + 1);
        const res = await request(app)
            .post('/api/pohapp/admin/bulk/approve')
            .send({ type: 'planta', ids });
        expect(res.status).toBe(422);
    });

    function pendingPlanta(id) {
        return { toJSON: () => ({ idplanta: id, nombre: `Planta ${id}`, descripcion: 'Uso tradicional', estado: 'PE' }) };
    }

    it('returns per-item results with ok/failed summary', async () => {
        planta.findByPk = jest.fn()
            .mockResolvedValueOnce(pendingPlanta(10))
            .mockResolvedValueOnce(pendingPlanta(99));
        planta.update = jest
            .fn()
            .mockResolvedValueOnce([1])
            .mockResolvedValueOnce([0]);

        const res = await request(app)
            .post('/api/pohapp/admin/bulk/approve')
            .send({ type: 'planta', ids: [10, 99] });

        expect(res.status).toBe(200);
        expect(res.body.summary).toEqual({ total: 2, ok: 1, failed: 1 });
        expect(res.body.results).toHaveLength(2);
        expect(fakeTransaction.commit).toHaveBeenCalled();
    });

    it('marks item failed with 422 code when moderation rejects it', async () => {
        planta.findByPk = jest.fn()
            .mockResolvedValueOnce(pendingPlanta(10))
            .mockResolvedValueOnce(pendingPlanta(11));
        planta.update = jest.fn().mockResolvedValue([1]);
        mockModerate
            .mockRejectedValueOnce(Object.assign(new Error('rechazado'), {
                statusCode: 422,
                code: 'CONTENT_REJECTED',
            }))
            .mockResolvedValueOnce({ status: 'allowed' });

        const res = await request(app)
            .post('/api/pohapp/admin/bulk/approve')
            .send({ type: 'planta', ids: [10, 11] });

        expect(res.status).toBe(200);
        expect(res.body.summary).toEqual({ total: 2, ok: 1, failed: 1 });
        expect(res.body.results[0]).toMatchObject({
            id: '10',
            status: 'failed',
            error: { code: 'CONTENT_REJECTED' },
        });
        expect(res.body.results[1].status).toBe('ok');
    });

    it('keeps item failed (fail-closed) when moderation is unavailable', async () => {
        planta.findByPk = jest.fn().mockResolvedValueOnce(pendingPlanta(10));
        planta.update = jest.fn().mockResolvedValue([1]);
        mockModerate.mockRejectedValueOnce(Object.assign(new Error('no disponible'), {
            statusCode: 503,
            code: 'MODERATION_UNAVAILABLE',
        }));

        const res = await request(app)
            .post('/api/pohapp/admin/bulk/approve')
            .send({ type: 'planta', ids: [10] });

        expect(res.status).toBe(200);
        expect(res.body.summary).toEqual({ total: 1, ok: 0, failed: 1 });
        expect(res.body.results[0]).toMatchObject({
            status: 'failed',
            error: { code: 'MODERATION_UNAVAILABLE' },
        });
        expect(planta.update).not.toHaveBeenCalled();
    });
});
