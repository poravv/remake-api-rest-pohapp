/**
 * Boundary tests for /api/pohapp/admin/embeddings/regenerate (+ /:idpoha).
 *
 * Strategy: mock ONLY external dependencies (OpenAI, Sequelize, Redis caches)
 * and the auth/rate-limit middleware boundary. The real embeddingRegenService
 * runs, so the idempotency-by-hash logic and the response contract the admin
 * panel types as RetrainSummary are exercised for real.
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

let mockAdminMode = true;
jest.mock('../../src/middleware/auth', () => ({
  verifyToken: (req, _res, next) => {
    req.user = { uid: 'admin-uid', isAdmin: mockAdminMode ? 1 : 0 };
    next();
  },
  requireAdmin: (req, res, next) => {
    if (req.user && req.user.isAdmin === 1) return next();
    return res.status(403).json({ error: 'Acceso denegado' });
  },
  optionalAuth: (_req, _res, next) => next(),
}));

jest.mock('../../src/middleware/rateLimitAdmin', () => (_req, _res, next) => next());

const mockEmbeddingsCreate = jest.fn();
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: { create: mockEmbeddingsCreate },
  })),
}));

const mockDbQuery = jest.fn();
jest.mock('../../src/database', () => ({
  query: mockDbQuery,
}));

const request = require('supertest');
const express = require('express');
const embeddingCache = require('../../src/services/embeddingCache');

function resumenOf(row) {
  return `Dolencias que trata: ${row.dolencias || ''}. ${row.texto_entrenamiento || ''}`.trim();
}

// Fake vw_medicina_entrenamiento LEFT JOIN medicina_embeddings result set.
let trainingRows;
let replaces;

function buildApp() {
  const app = express();
  app.use(express.json());
  // eslint-disable-next-line global-require
  app.use('/api/pohapp/admin/embeddings', require('../../src/routes/admin/embeddings'));
  return app;
}

describe('POST /api/pohapp/admin/embeddings/regenerate', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminMode = true;
    trainingRows = [];
    replaces = [];
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
    mockDbQuery.mockImplementation(async (sql, opts) => {
      if (/REPLACE INTO medicina_embeddings/i.test(sql)) {
        replaces.push(opts.replacements);
        return [[]];
      }
      if (/DELETE FROM medicina_embeddings/i.test(sql)) return [[]];
      if (/FROM vw_medicina_entrenamiento v/i.test(sql)) {
        if (/WHERE v\.idpoha/i.test(sql)) {
          const row = trainingRows.find((r) => r.idpoha === opts.replacements.idpoha);
          return [row ? [row] : []];
        }
        return [trainingRows];
      }
      return [[]];
    });
  });

  it('should_repopulate_all_when_embeddings_empty', async () => {
    trainingRows = [
      { idpoha: 1, texto_entrenamiento: 'Texto 1', dolencias: 'gripe', stored_hash: null },
      { idpoha: 2, texto_entrenamiento: 'Texto 2', dolencias: 'tos', stored_hash: null },
      { idpoha: 3, texto_entrenamiento: 'Texto 3', dolencias: 'fiebre', stored_hash: null },
    ];

    const res = await request(app).post('/api/pohapp/admin/embeddings/regenerate');

    expect(res.status).toBe(200);
    // Exact RetrainSummary contract expected by the admin panel.
    expect(res.body).toEqual({
      total: 3,
      regenerated: 3,
      skipped: 0,
      missing: 0,
      errors: 0,
      failed: [],
    });
    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(3);
    expect(replaces).toHaveLength(3);
  });

  it('should_skip_all_when_hashes_unchanged', async () => {
    trainingRows = [
      { idpoha: 1, texto_entrenamiento: 'Texto 1', dolencias: 'gripe' },
      { idpoha: 2, texto_entrenamiento: 'Texto 2', dolencias: 'tos' },
    ].map((row) => ({ ...row, stored_hash: embeddingCache.hashOf(resumenOf(row)) }));

    const res = await request(app).post('/api/pohapp/admin/embeddings/regenerate');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, regenerated: 0, skipped: 2, errors: 0 });
    expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
  });

  it('should_count_missing_when_training_text_is_empty', async () => {
    trainingRows = [
      { idpoha: 1, texto_entrenamiento: 'Texto 1', dolencias: 'gripe', stored_hash: null },
      { idpoha: 2, texto_entrenamiento: '', dolencias: 'tos', stored_hash: null },
    ];

    const res = await request(app).post('/api/pohapp/admin/embeddings/regenerate');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, regenerated: 1, missing: 1 });
  });

  it('should_report_failed_rows_when_openai_errors', async () => {
    trainingRows = [
      { idpoha: 1, texto_entrenamiento: 'Texto 1', dolencias: 'gripe', stored_hash: null },
    ];
    mockEmbeddingsCreate.mockRejectedValue(new Error('OpenAI 500'));

    const res = await request(app).post('/api/pohapp/admin/embeddings/regenerate');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, regenerated: 0, errors: 1 });
    expect(res.body.failed).toEqual([{ idpoha: 1, error: 'OpenAI 500' }]);
  });

  it('should_return_503_when_openai_key_missing', async () => {
    const key = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const res = await request(app).post('/api/pohapp/admin/embeddings/regenerate');
      expect(res.status).toBe(503);
    } finally {
      process.env.OPENAI_API_KEY = key;
    }
  });

  it('should_return_403_when_user_is_not_admin', async () => {
    mockAdminMode = false;
    const res = await request(app).post('/api/pohapp/admin/embeddings/regenerate');
    expect(res.status).toBe(403);
  });
});

describe('POST /api/pohapp/admin/embeddings/regenerate/:idpoha', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminMode = true;
    trainingRows = [];
    replaces = [];
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
    mockDbQuery.mockImplementation(async (sql, opts) => {
      if (/REPLACE INTO medicina_embeddings/i.test(sql)) {
        replaces.push(opts.replacements);
        return [[]];
      }
      if (/FROM vw_medicina_entrenamiento v/i.test(sql)) {
        const row = trainingRows.find((r) => r.idpoha === opts.replacements.idpoha);
        return [row ? [row] : []];
      }
      return [[]];
    });
  });

  it('should_regenerate_single_poha_when_hash_changed', async () => {
    trainingRows = [
      { idpoha: 5, texto_entrenamiento: 'Texto 5', dolencias: 'gripe', stored_hash: null },
    ];

    const res = await request(app).post('/api/pohapp/admin/embeddings/regenerate/5');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'regenerated', idpoha: 5 });
    expect(replaces).toHaveLength(1);
    expect(replaces[0].idpoha).toBe(5);
  });

  it('should_return_missing_when_poha_has_no_training_text', async () => {
    const res = await request(app).post('/api/pohapp/admin/embeddings/regenerate/999');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'missing', idpoha: 999 });
    expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
  });

  it('should_return_400_when_idpoha_is_invalid', async () => {
    const bad = await request(app).post('/api/pohapp/admin/embeddings/regenerate/abc');
    expect(bad.status).toBe(400);

    const negative = await request(app).post('/api/pohapp/admin/embeddings/regenerate/-1');
    expect(negative.status).toBe(400);
  });

  it('should_return_503_when_openai_key_missing', async () => {
    const key = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const res = await request(app).post('/api/pohapp/admin/embeddings/regenerate/5');
      expect(res.status).toBe(503);
    } finally {
      process.env.OPENAI_API_KEY = key;
    }
  });
});
