/**
 * Boundary tests for POST /query-nlp/preview backed by retrievalService.
 *
 * Strategy: mock ONLY external dependencies (OpenAI, Sequelize, Redis caches).
 * The real retrievalService runs, so preview exercises the SAME retrieval
 * parameters as the productive rag pipeline (top-6 vector >= AI_SIMILARITY_MIN
 * + hybrid, cap 8) — this suite is the pre-cutover smoke test.
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
const retrievalService = require('../../src/services/retrievalService');

function vec(axis) {
  const v = new Array(8).fill(0);
  v[axis] = 1;
  return v;
}

let db;

function buildApp() {
  const app = express();
  app.use(express.json());
  // eslint-disable-next-line global-require
  app.use('/api/pohapp/query-nlp/preview', require('../../src/routes/queryNLP'));
  return app;
}

describe('POST /api/pohapp/query-nlp/preview', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    retrievalService.invalidateVectorCache();
    db = { embeddings: [], hybridIds: [] };
    mockDbQuery.mockImplementation(async (sql) => {
      if (/FROM medicina_embeddings/i.test(sql)) return [db.embeddings];
      if (/FROM dolencias d/i.test(sql)) return [db.hybridIds.map((id) => ({ idpoha: id }))];
      return [[]];
    });
  });

  function preview(pregunta) {
    return request(app)
      .post('/api/pohapp/query-nlp/preview')
      .set('Content-Type', 'application/json')
      .send({ pregunta });
  }

  it('should_return_ranked_candidates_when_embeddings_populated', async () => {
    db.embeddings = [
      { idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'Menta digestiva' },
      { idpoha: 7, embedding: JSON.stringify(vec(1)), resumen: 'Otra planta' },
    ];
    db.hybridIds = [9];
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });

    const res = await preview('dolor de estomago');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    // Vector hit first (score 1), hybrid-only hit appended with score 0;
    // idpoha 7 (score 0 < threshold) is filtered out.
    expect(res.body.resultados[0]).toMatchObject({ idpoha: 3, resumen: 'Menta digestiva' });
    expect(res.body.resultados[0].score).toBeCloseTo(1, 5);
    expect(res.body.resultados[1]).toMatchObject({ idpoha: 9, score: 0 });
    expect(res.body.sugerencia).toBeUndefined();
  });

  it('should_return_sugerencia_when_no_candidates', async () => {
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });

    const res = await preview('algo sin match');

    expect(res.status).toBe(200);
    expect(res.body.resultados).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(typeof res.body.sugerencia).toBe('string');
    expect(res.body.sugerencia.length).toBeGreaterThan(0);
  });

  it('should_return_400_when_pregunta_missing', async () => {
    const res = await preview(undefined);
    expect(res.status).toBe(400);
  });

  it('should_return_503_when_openai_key_missing', async () => {
    const key = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const res = await preview('dolor de cabeza');
      expect(res.status).toBe(503);
    } finally {
      process.env.OPENAI_API_KEY = key;
    }
  });
});
