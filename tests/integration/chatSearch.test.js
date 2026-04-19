/**
 * Integration tests for POST /api/pohapp/chat/search.
 *
 * Sequelize is mocked so the test focuses on the route + service wiring
 * (auth gate, validation, cursor encode/decode, SQL arguments).
 */

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
  cacheMiddleware: () => (_req, _res, next) => next(),
  invalidateByPrefix: jest.fn(),
}));

jest.mock('../../src/middleware/signImages', () => ({
  signMinioUrls: (_req, _res, next) => next(),
  addSigningInfo: (_req, _res, next) => next(),
}));

// Auth stub: treat any Bearer token as user 'u-test'.
jest.mock('../../src/middleware/auth', () => ({
  verifyToken: (req, res, next) => {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    req.user = { uid: 'u-test', isAdmin: 0 };
    next();
  },
  requireAdmin: (_req, _res, next) => next(),
  optionalAuth: (_req, _res, next) => next(),
}));

const mockDatabase = {
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
};
jest.mock('../../src/database', () => mockDatabase);

const request = require('supertest');
const express = require('express');

function buildApp() {
  const app = express();
  app.use(express.json());
  // eslint-disable-next-line global-require
  const rutas = require('../../src/config_rutas');
  app.use(rutas);
  return app;
}

function makeRow({ id, fecha }) {
  return {
    id,
    idusuario: 'u-test',
    pregunta: `pregunta ${id}`,
    respuesta: `respuesta ${id}`,
    fecha,
    idpoha_json: JSON.stringify([id]),
    imagenes_json: JSON.stringify([]),
  };
}

describe('POST /api/pohapp/chat/search', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no Bearer token is provided', async () => {
    const res = await request(app)
      .post('/api/pohapp/chat/search')
      .send({ idusuario: 'u-test' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when idusuario is missing', async () => {
    const res = await request(app)
      .post('/api/pohapp/chat/search')
      .set('Authorization', 'Bearer x')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns items + null cursor when below page size', async () => {
    mockDatabase.query.mockResolvedValueOnce([
      [
        makeRow({ id: 3, fecha: '2026-04-18T10:00:00Z' }),
        makeRow({ id: 2, fecha: '2026-04-17T10:00:00Z' }),
      ],
    ]);

    const res = await request(app)
      .post('/api/pohapp/chat/search')
      .set('Authorization', 'Bearer x')
      .send({ idusuario: 'u-test', limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.next_cursor).toBeNull();
  });

  it('returns next_cursor when more rows are available', async () => {
    // limit=2 => service fetches limit+1 (3 rows); presence of 3rd means hasMore.
    mockDatabase.query.mockResolvedValueOnce([
      [
        makeRow({ id: 5, fecha: '2026-04-18T10:00:00Z' }),
        makeRow({ id: 4, fecha: '2026-04-17T10:00:00Z' }),
        makeRow({ id: 3, fecha: '2026-04-16T10:00:00Z' }),
      ],
    ]);

    const res = await request(app)
      .post('/api/pohapp/chat/search')
      .set('Authorization', 'Bearer x')
      .send({ idusuario: 'u-test', limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.next_cursor).toEqual(expect.any(String));
  });

  it('rejects invalid cursor with 400', async () => {
    const res = await request(app)
      .post('/api/pohapp/chat/search')
      .set('Authorization', 'Bearer x')
      .send({ idusuario: 'u-test', cursor: '!!!not-base64!!!' });
    expect(res.status).toBe(400);
  });

  it('rejects limit > MAX_LIMIT', async () => {
    const res = await request(app)
      .post('/api/pohapp/chat/search')
      .set('Authorization', 'Bearer x')
      .send({ idusuario: 'u-test', limit: 500 });
    expect(res.status).toBe(400);
  });

  it('runs FULLTEXT path when q is present', async () => {
    mockDatabase.query.mockResolvedValueOnce([
      [makeRow({ id: 1, fecha: '2026-04-18T10:00:00Z' })],
    ]);

    await request(app)
      .post('/api/pohapp/chat/search')
      .set('Authorization', 'Bearer x')
      .send({ idusuario: 'u-test', q: 'kaa he e' });

    const sql = mockDatabase.query.mock.calls[0][0];
    expect(sql).toMatch(/MATCH\(pregunta, respuesta\)/);
  });
});
