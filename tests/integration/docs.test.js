/**
 * Integration tests for the public API documentation surface.
 *
 * Verifies:
 *  - GET /api/pohapp/docs serves Swagger UI HTML when ENABLE_SWAGGER_DOCS=true.
 *  - GET /api/pohapp/docs/swagger.json returns a valid OpenAPI 3.0.1 spec.
 *  - Spec excludes ALL private paths (admin, usuario, autor, puntos, chat/search).
 *  - Spec includes the expected public routers.
 *  - Public schemas do NOT leak internal audit fields (idusuario, idautor, estado).
 *  - Spec is valid per @apidevtools/swagger-parser.
 *  - With ENABLE_SWAGGER_DOCS=false, /docs returns 404.
 */
const request = require('supertest');
const express = require('express');

// Shared mocks (aligned with tests/integration/planta.test.js pattern).
jest.mock('../../src/services/cacheClient', () => ({
    initRedis: jest.fn().mockResolvedValue(false),
    isRedisReady: jest.fn().mockReturnValue(false),
    hasRedisConfig: jest.fn().mockReturnValue(false),
    getRedisClient: jest.fn().mockReturnValue(null),
    getFromMemory: jest.fn().mockReturnValue(null),
    setInMemory: jest.fn(),
    invalidateByPrefix: jest.fn(),
}));

jest.mock('../../src/middleware/cache', () => ({
    cacheMiddleware: () => (req, res, next) => next(),
    invalidateByPrefix: jest.fn(),
}));

jest.mock('../../src/middleware/signImages', () => ({
    signMinioUrls: (req, res, next) => next(),
    addSigningInfo: (req, res, next) => next(),
}));

jest.mock('../../src/database', () => ({
    query: jest.fn().mockResolvedValue([[]]),
    authenticate: jest.fn().mockResolvedValue(true),
    define: jest.fn(() => ({
        findAll: jest.fn().mockResolvedValue([]),
        findByPk: jest.fn().mockResolvedValue(null),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue([0]),
        destroy: jest.fn().mockResolvedValue(0),
        count: jest.fn().mockResolvedValue(0),
        hasOne: jest.fn(),
        hasMany: jest.fn(),
        belongsTo: jest.fn(),
    })),
}));

jest.mock('../../src/services/minioService', () => ({
    getPresignedUrl: jest.fn().mockResolvedValue('https://mock-url.com'),
    isMinioUrl: jest.fn().mockReturnValue(false),
    extractObjectName: jest.fn().mockReturnValue('test.jpg'),
}));

function buildAppWithFlag(flagValue) {
    jest.resetModules();
    // Re-apply the shared mocks on the fresh module registry.
    jest.doMock('../../src/services/cacheClient', () => ({
        initRedis: jest.fn().mockResolvedValue(false),
        isRedisReady: jest.fn().mockReturnValue(false),
        hasRedisConfig: jest.fn().mockReturnValue(false),
        getRedisClient: jest.fn().mockReturnValue(null),
        getFromMemory: jest.fn().mockReturnValue(null),
        setInMemory: jest.fn(),
        invalidateByPrefix: jest.fn(),
    }));
    jest.doMock('../../src/middleware/cache', () => ({
        cacheMiddleware: () => (req, res, next) => next(),
        invalidateByPrefix: jest.fn(),
    }));
    jest.doMock('../../src/middleware/signImages', () => ({
        signMinioUrls: (req, res, next) => next(),
        addSigningInfo: (req, res, next) => next(),
    }));
    jest.doMock('../../src/database', () => ({
        query: jest.fn().mockResolvedValue([[]]),
        authenticate: jest.fn().mockResolvedValue(true),
        define: jest.fn(() => ({
            findAll: jest.fn().mockResolvedValue([]),
            findByPk: jest.fn().mockResolvedValue(null),
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue([0]),
            destroy: jest.fn().mockResolvedValue(0),
            count: jest.fn().mockResolvedValue(0),
            hasOne: jest.fn(),
            hasMany: jest.fn(),
            belongsTo: jest.fn(),
        })),
    }));
    jest.doMock('../../src/services/minioService', () => ({
        getPresignedUrl: jest.fn().mockResolvedValue('https://mock-url.com'),
        isMinioUrl: jest.fn().mockReturnValue(false),
        extractObjectName: jest.fn().mockReturnValue('test.jpg'),
    }));

    process.env.ENABLE_SWAGGER_DOCS = flagValue;
    const rutas = require('../../src/config_rutas');
    const app = express();
    app.use(express.json());
    app.use(rutas);
    return app;
}

describe('Public API docs (ENABLE_SWAGGER_DOCS=true)', () => {
    let app;
    let spec;

    beforeAll(async () => {
        app = buildAppWithFlag('true');
        const res = await request(app).get('/api/pohapp/docs/swagger.json');
        spec = res.body;
        expect(res.status).toBe(200);
    });

    it('GET /api/pohapp/docs/ serves Swagger UI HTML', async () => {
        const res = await request(app).get('/api/pohapp/docs/');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.text).toContain('Pohã ÑanApp');
    });

    it('swagger.json returns OpenAPI 3.0.1', () => {
        expect(spec.openapi).toBe('3.0.1');
        expect(spec.info.title).toBe('Pohã ÑanApp Public API');
    });

    it.each([
        '/admin/',
        '/usuario/',
        '/autor/',
        '/puntos/',
        '/chat/search',
        '/query-nlp/preview',
    ])('does NOT expose private path fragment %s', (fragment) => {
        const leaked = Object.keys(spec.paths || {}).filter((p) => p.includes(fragment));
        expect(leaked).toEqual([]);
    });

    it.each([
        ['Plantas',        '/api/pohapp/planta/get'],
        ['Dolencias',      '/api/pohapp/dolencias/get'],
        ['Remedios (Pohã)', '/api/pohapp/poha/get'],
        ['Medicinales',    '/api/pohapp/medicinales/get'],
        ['IA',             '/api/pohapp/query-nlp/explica'],
        ['Chat',           '/api/pohapp/chat/historial'],
        ['Imagenes',       '/api/pohapp/imagenes/signed'],
    ])('exposes public router %s (%s)', (_tag, path) => {
        expect(Object.keys(spec.paths)).toEqual(
            expect.arrayContaining([path]),
        );
    });

    it.each(['PlantaPublic', 'DolenciaPublic', 'PohaPublic'])(
        'public schema %s omits audit fields',
        (name) => {
            const props = spec.components.schemas[name].properties;
            expect(props.idusuario).toBeUndefined();
            expect(props.idautor).toBeUndefined();
            expect(props.estado).toBeUndefined();
        },
    );

    it('apis list in options is explicit (no glob chars)', () => {
        const { options } = require('../../src/docs/openapi');
        expect(options.apis.length).toBe(7);
        for (const entry of options.apis) {
            expect(typeof entry).toBe('string');
            expect(entry).not.toMatch(/[\*\?\{\[]/);
            expect(entry.endsWith('.js')).toBe(true);
        }
    });

    it('spec validates with @apidevtools/swagger-parser', async () => {
        const SwaggerParser = require('@apidevtools/swagger-parser');
        // validate() mutates its input; clone to avoid side effects.
        const clone = JSON.parse(JSON.stringify(spec));
        await expect(SwaggerParser.validate(clone)).resolves.toBeDefined();
    });

    it('rate-limited endpoint /query-nlp/explica documents aiLimiter', () => {
        const op = spec.paths['/api/pohapp/query-nlp/explica'].post;
        expect(op.description).toMatch(/aiLimiter/);
        expect(op.description).toMatch(/30/);
        expect(Object.keys(op.responses)).toEqual(
            expect.arrayContaining(['200', '400', '415', '429', '500', '503']),
        );
    });
});

describe('Public API docs (ENABLE_SWAGGER_DOCS=false)', () => {
    it('GET /api/pohapp/docs/ returns 404 when flag is off', async () => {
        const app = buildAppWithFlag('false');
        const res = await request(app).get('/api/pohapp/docs/');
        expect(res.status).toBe(404);
    });

    it('GET /api/pohapp/docs/swagger.json returns 404 when flag is off', async () => {
        const app = buildAppWithFlag('false');
        const res = await request(app).get('/api/pohapp/docs/swagger.json');
        expect(res.status).toBe(404);
    });
});
