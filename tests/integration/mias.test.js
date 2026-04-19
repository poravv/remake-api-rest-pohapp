/**
 * Integration tests for GET /api/pohapp/{planta,dolencias,poha}/mias.
 *
 * Strategy: mock `middleware/auth` to inject a non-admin req.user so we
 * skip real Firebase, and mock each service's `listByUser` to control
 * return shape. A dedicated `verifyToken401` variant is toggled per
 * test when we want to assert the 401 path.
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
            uid: mockAuthState.uid ?? 'user-a',
            email: 'user-a@test.com',
            isAdmin: 0,
        };
        next();
    },
    requireAdmin: (_req, _res, next) => next(),
    optionalAuth: (_req, _res, next) => next(),
}));

const mockPlantaService = {
    listByUser: jest.fn(),
    // Stubs required by other handlers the router registers.
    getAllPlantas: jest.fn().mockResolvedValue([]),
    getPlantaById: jest.fn().mockResolvedValue(null),
    searchByNombre: jest.fn().mockResolvedValue([]),
    getPlantasLimited: jest.fn().mockResolvedValue([]),
    getPlantasUsage: jest.fn().mockResolvedValue([]),
};
jest.mock('../../src/services/plantaService', () => mockPlantaService);

const mockDolenciasService = {
    listByUser: jest.fn(),
    getAllDolencias: jest.fn().mockResolvedValue([]),
    getDolenciasById: jest.fn().mockResolvedValue(null),
    searchByDescripcion: jest.fn().mockResolvedValue([]),
    getDolenciasUsage: jest.fn().mockResolvedValue([]),
};
jest.mock('../../src/services/dolenciasService', () => mockDolenciasService);

const mockPohaService = {
    listByUser: jest.fn(),
    getAllPoha: jest.fn().mockResolvedValue([]),
    getPohaById: jest.fn().mockResolvedValue(null),
    countPoha: jest.fn().mockResolvedValue(0),
    getPohaFiltered: jest.fn().mockResolvedValue([]),
    getPohaFilteredPaginated: jest.fn().mockResolvedValue({ items: [], total: 0, page: 0, pageSize: 10 }),
};
jest.mock('../../src/services/pohaService', () => mockPohaService);

// Cache middleware is pass-through for these tests.
jest.mock('../../src/middleware/cache', () => ({
    cacheMiddleware: () => (_req, _res, next) => next(),
    invalidateByPrefix: jest.fn(),
}));

const plantaRouter = require('../../src/routes/ruta_planta');
const dolenciasRouter = require('../../src/routes/ruta_dolencias');
const pohaRouter = require('../../src/routes/ruta_poha');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/pohapp/planta', plantaRouter);
    app.use('/api/pohapp/dolencias', dolenciasRouter);
    app.use('/api/pohapp/poha', pohaRouter);
    return app;
}

describe('GET /api/pohapp/:resource/mias', () => {
    let app;
    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
        mockAuthState.mode = 'user';
        mockAuthState.uid = 'user-a';
    });

    describe('auth gate', () => {
        it.each([
            ['/api/pohapp/planta/mias'],
            ['/api/pohapp/dolencias/mias'],
            ['/api/pohapp/poha/mias'],
        ])('returns 401 without token on %s', async (url) => {
            mockAuthState.mode = 'anon';
            const res = await request(app).get(url);
            expect(res.status).toBe(401);
        });
    });

    describe('/planta/mias', () => {
        it('invokes plantaService.listByUser with req.user.uid and query filters', async () => {
            mockPlantaService.listByUser.mockResolvedValue({
                items: [{ idplanta: 1, nombre: 'Menta' }],
                total: 1,
                limit: 20,
                offset: 0,
            });
            const res = await request(app)
                .get('/api/pohapp/planta/mias')
                .query({ estado: 'AC', limit: 10, offset: 5, q: 'men' });
            expect(res.status).toBe(200);
            expect(mockPlantaService.listByUser).toHaveBeenCalledWith('user-a', {
                estado: 'AC',
                limit: '10',
                offset: '5',
                q: 'men',
            });
            expect(res.body.items).toHaveLength(1);
            expect(res.body.total).toBe(1);
        });

        it('isolates results by uid (user B cannot see user A data)', async () => {
            mockAuthState.uid = 'user-b';
            mockPlantaService.listByUser.mockResolvedValue({
                items: [],
                total: 0,
                limit: 20,
                offset: 0,
            });
            const res = await request(app).get('/api/pohapp/planta/mias');
            expect(res.status).toBe(200);
            expect(mockPlantaService.listByUser).toHaveBeenCalledWith('user-b', expect.any(Object));
        });
    });

    describe('/dolencias/mias', () => {
        it('returns the service payload through', async () => {
            mockDolenciasService.listByUser.mockResolvedValue({
                items: [{ iddolencias: 10, descripcion: 'dolor' }],
                total: 1,
                limit: 20,
                offset: 0,
            });
            const res = await request(app).get('/api/pohapp/dolencias/mias');
            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
            expect(mockDolenciasService.listByUser).toHaveBeenCalledWith('user-a', expect.any(Object));
        });
    });

    describe('/poha/mias', () => {
        it('filters by estado=PE when query requests it', async () => {
            mockPohaService.listByUser.mockResolvedValue({
                items: [{ idpoha: 3, preparado: 'x', estado: 'PE' }],
                total: 1,
                limit: 20,
                offset: 0,
            });
            const res = await request(app)
                .get('/api/pohapp/poha/mias')
                .query({ estado: 'PE' });
            expect(res.status).toBe(200);
            expect(mockPohaService.listByUser).toHaveBeenCalledWith(
                'user-a',
                expect.objectContaining({ estado: 'PE' }),
            );
        });

        it('propagates service errors with their statusCode', async () => {
            const err = new Error('boom');
            err.statusCode = 400;
            mockPohaService.listByUser.mockRejectedValue(err);
            const res = await request(app).get('/api/pohapp/poha/mias');
            expect(res.status).toBe(400);
        });
    });
});
