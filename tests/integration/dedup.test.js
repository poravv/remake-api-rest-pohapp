/**
 * Integration tests for /planta/similar and /dolencia/suggest.
 *
 * Mocks the dedupService so the tests exercise the route wiring +
 * query validation without needing a live database.
 */

const request = require('supertest');
const express = require('express');

const mockDedup = {
    findSimilarPlantas: jest.fn(),
    suggestDolencias: jest.fn(),
    MIN_QUERY_LENGTH: 2,
};
jest.mock('../../src/services/dedupService', () => mockDedup);

const dedupRouter = require('../../src/routes/dedup');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/pohapp', dedupRouter);
    return app;
}

describe('dedup router', () => {
    let app;
    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
    });

    describe('GET /planta/similar', () => {
        it('returns empty items when query is too short', async () => {
            const res = await request(app).get('/api/pohapp/planta/similar?nombre=m');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ items: [], reason: 'query_too_short' });
            expect(mockDedup.findSimilarPlantas).not.toHaveBeenCalled();
        });

        it('forwards the query + limit and returns items', async () => {
            mockDedup.findSimilarPlantas.mockResolvedValue([
                { idplanta: 1, nombre: 'Menta', nombre_cientifico: 'Mentha', familia: 'Lamiaceae' },
            ]);
            const res = await request(app)
                .get('/api/pohapp/planta/similar')
                .query({ nombre: 'Ment', limit: 3 });
            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
            expect(mockDedup.findSimilarPlantas).toHaveBeenCalledWith('Ment', '3');
        });

        it('returns 500 on service error', async () => {
            mockDedup.findSimilarPlantas.mockRejectedValue(new Error('db down'));
            const res = await request(app)
                .get('/api/pohapp/planta/similar?nombre=Ment');
            expect(res.status).toBe(500);
        });
    });

    describe('GET /dolencia/suggest', () => {
        it('returns empty items when query is too short', async () => {
            const res = await request(app).get('/api/pohapp/dolencia/suggest?q=d');
            expect(res.status).toBe(200);
            expect(res.body.reason).toBe('query_too_short');
        });

        it('forwards the query + limit and returns items', async () => {
            mockDedup.suggestDolencias.mockResolvedValue([
                { iddolencias: 10, descripcion: 'dolor de cabeza' },
            ]);
            const res = await request(app)
                .get('/api/pohapp/dolencia/suggest')
                .query({ q: 'dolor', limit: 5 });
            expect(res.status).toBe(200);
            expect(res.body.items[0].descripcion).toBe('dolor de cabeza');
            expect(mockDedup.suggestDolencias).toHaveBeenCalledWith('dolor', '5');
        });
    });
});
