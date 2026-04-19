/**
 * Integration tests for /api/pohapp/admin/catalog/*.
 *
 * Strategy: mock middleware/auth to inject an admin req.user, mock the
 * adminCatalogService at the service boundary, and exercise the router
 * through a minimal Express app via supertest.
 */

const request = require('supertest');
const express = require('express');

let mockAdminMode = true;

jest.mock('../../src/middleware/auth', () => ({
    verifyToken: (req, _res, next) => {
        req.user = { uid: 'admin-uid', email: 'admin@test.com', isAdmin: mockAdminMode ? 1 : 0 };
        next();
    },
    requireAdmin: (req, res, next) => {
        if (req.user && req.user.isAdmin === 1) return next();
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado: se requiere rol de administrador',
        });
    },
    optionalAuth: (_req, _res, next) => next(),
}));

jest.mock('../../src/services/auditLogService', () => ({
    log: jest.fn().mockResolvedValue({ id: 1 }),
    sanitizePayload: (v) => v,
    SENSITIVE_KEYS: new Set(),
}));

const mockAdminCatalogService = {
    listPlantas: jest.fn(),
    listDolencias: jest.fn(),
    listPohas: jest.fn(),
};
jest.mock('../../src/services/adminCatalogService', () => mockAdminCatalogService);

const catalogRouter = require('../../src/routes/admin/catalog');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/pohapp/admin/catalog', catalogRouter);
    return app;
}

describe('admin/catalog router', () => {
    let app;

    beforeEach(() => {
        mockAdminMode = true;
        app = buildApp();
        jest.clearAllMocks();
    });

    it('GET /plantas returns items with pagination envelope', async () => {
        mockAdminCatalogService.listPlantas.mockResolvedValue({
            items: [{ idplanta: 1, nombre: 'Menta', estado: 'AC' }],
            total: 1,
            limit: 50,
            offset: 0,
        });

        const res = await request(app).get('/api/pohapp/admin/catalog/plantas');

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.total).toBe(1);
        expect(mockAdminCatalogService.listPlantas).toHaveBeenCalledWith({
            estado: 'all',
            limit: 50,
            offset: 0,
            q: '',
        });
    });

    it('GET /plantas forwards estado=PE filter', async () => {
        mockAdminCatalogService.listPlantas.mockResolvedValue({
            items: [], total: 0, limit: 50, offset: 0,
        });

        const res = await request(app).get('/api/pohapp/admin/catalog/plantas?estado=PE');

        expect(res.status).toBe(200);
        expect(mockAdminCatalogService.listPlantas).toHaveBeenCalledWith(
            expect.objectContaining({ estado: 'PE' }),
        );
    });

    it('GET /dolencias honors limit and offset', async () => {
        mockAdminCatalogService.listDolencias.mockResolvedValue({
            items: [{ iddolencias: 2, descripcion: 'Tos', estado: 'IN' }],
            total: 7,
            limit: 10,
            offset: 5,
        });

        const res = await request(app).get(
            '/api/pohapp/admin/catalog/dolencias?estado=IN&limit=10&offset=5',
        );

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(7);
        expect(mockAdminCatalogService.listDolencias).toHaveBeenCalledWith({
            estado: 'IN',
            limit: 10,
            offset: 5,
            q: '',
        });
    });

    it('GET /pohas accepts q search term', async () => {
        mockAdminCatalogService.listPohas.mockResolvedValue({
            items: [], total: 0, limit: 50, offset: 0,
        });

        const res = await request(app).get('/api/pohapp/admin/catalog/pohas?q=mate');

        expect(res.status).toBe(200);
        expect(mockAdminCatalogService.listPohas).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'mate' }),
        );
    });

    it('GET /plantas returns 400 on invalid estado', async () => {
        const res = await request(app).get('/api/pohapp/admin/catalog/plantas?estado=XX');
        expect(res.status).toBe(400);
        expect(mockAdminCatalogService.listPlantas).not.toHaveBeenCalled();
    });

    it('GET /plantas returns 400 on limit out of range', async () => {
        const res = await request(app).get('/api/pohapp/admin/catalog/plantas?limit=999');
        expect(res.status).toBe(400);
    });

    it('GET /plantas rejects non-admin with 403', async () => {
        mockAdminMode = false;
        const res = await request(app).get('/api/pohapp/admin/catalog/plantas');
        expect(res.status).toBe(403);
        expect(mockAdminCatalogService.listPlantas).not.toHaveBeenCalled();
    });
});
