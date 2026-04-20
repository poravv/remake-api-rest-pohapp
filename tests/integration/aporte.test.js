/**
 * Integration tests for POST /api/pohapp/aporte/poha/atomic.
 *
 * Mocks the auth middleware to inject a non-admin req.user and the
 * aporte service to control return shape. Focus: the route wiring,
 * auth gate, and error status passthrough — the service logic already
 * has unit coverage via pohaRelations.test.js for the transaction
 * primitives.
 */

const request = require('supertest');
const express = require('express');

const mockAuthState = { mode: 'user' };

jest.mock('../../src/middleware/auth', () => ({
    verifyToken: (req, res, next) => {
        if (mockAuthState.mode === 'anon') {
            return res.status(401).json({ error: 'No autenticado' });
        }
        req.user = {
            uid: mockAuthState.uid ?? 'user-x',
            email: 'u@test.com',
            isAdmin: mockAuthState.isAdmin ?? 0,
        };
        next();
    },
    requireAdmin: (_req, _res, next) => next(),
    optionalAuth: (_req, _res, next) => next(),
}));

const mockAporteService = {
    createAtomicPohaAporte: jest.fn(),
};
jest.mock('../../src/services/aporteService', () => mockAporteService);

const aporteRouter = require('../../src/routes/aporte');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/pohapp/aporte', aporteRouter);
    return app;
}

describe('POST /api/pohapp/aporte/poha/atomic', () => {
    let app;
    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
        mockAuthState.mode = 'user';
        mockAuthState.uid = 'user-x';
        mockAuthState.isAdmin = 0;
    });

    it('returns 401 without token', async () => {
        mockAuthState.mode = 'anon';
        const res = await request(app).post('/api/pohapp/aporte/poha/atomic').send({});
        expect(res.status).toBe(401);
    });

    it('forwards body + req.user to the service and returns 201 on success', async () => {
        mockAporteService.createAtomicPohaAporte.mockResolvedValue({
            idpoha: 77,
            estado: 'PE',
            plantas: [1, 2],
            dolencias: [5],
        });
        const payload = {
            poha: { preparado: 'hervir 10 min', recomendacion: 'tomar tibio' },
            plantas: [{ id: 1 }, { nombre: 'Hierba X', descripcion: 'Planta x' }],
            dolencias: [{ id: 5 }],
        };
        const res = await request(app)
            .post('/api/pohapp/aporte/poha/atomic')
            .send(payload);
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ idpoha: 77, estado: 'PE', plantas: [1, 2], dolencias: [5] });
        expect(mockAporteService.createAtomicPohaAporte).toHaveBeenCalledWith(
            payload,
            expect.objectContaining({ uid: 'user-x' }),
        );
    });

    it('propagates 400 with the service error message', async () => {
        const err = new Error('Planta nueva sin `nombre`');
        err.statusCode = 400;
        mockAporteService.createAtomicPohaAporte.mockRejectedValue(err);
        const res = await request(app)
            .post('/api/pohapp/aporte/poha/atomic')
            .send({ poha: { preparado: 'x', recomendacion: 'y' }, plantas: [{}] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/nombre/);
    });

    it('returns 500 with a generic error when the service throws without statusCode', async () => {
        mockAporteService.createAtomicPohaAporte.mockRejectedValue(new Error('boom'));
        const res = await request(app)
            .post('/api/pohapp/aporte/poha/atomic')
            .send({ poha: { preparado: 'x', recomendacion: 'y' }, plantas: [1] });
        expect(res.status).toBe(500);
    });
});
