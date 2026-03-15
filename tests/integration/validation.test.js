const request = require('supertest');
const express = require('express');

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

// Mock all service layers
jest.mock('../../src/services/pohaService', () => ({
  countPoha: jest.fn().mockResolvedValue(0),
  getAllPoha: jest.fn().mockResolvedValue([]),
  getPohaById: jest.fn().mockResolvedValue(null),
  getPohaFiltered: jest.fn().mockResolvedValue([]),
  getPohaFilteredPaginated: jest.fn().mockResolvedValue([]),
  createPoha: jest.fn().mockResolvedValue({}),
  updatePoha: jest.fn().mockResolvedValue([0]),
  deletePoha: jest.fn().mockResolvedValue(0),
  getPendingPoha: jest.fn().mockResolvedValue([]),
  approvePoha: jest.fn().mockResolvedValue({}),
  rejectPoha: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../src/services/plantaService', () => ({
  searchByNombre: jest.fn().mockResolvedValue([]),
  getPlantasLimited: jest.fn().mockResolvedValue([]),
  getPlantasUsage: jest.fn().mockResolvedValue([]),
  getAllPlantas: jest.fn().mockResolvedValue([]),
  getPlantaById: jest.fn().mockResolvedValue(null),
  createPlanta: jest.fn().mockResolvedValue({}),
  updatePlanta: jest.fn().mockResolvedValue([0]),
  deletePlanta: jest.fn().mockResolvedValue(0),
  getPendingPlantas: jest.fn().mockResolvedValue([]),
  approvePlanta: jest.fn().mockResolvedValue({}),
  rejectPlanta: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../src/services/dolenciasService', () => ({
  searchByDescripcion: jest.fn().mockResolvedValue([]),
  getDolenciasUsage: jest.fn().mockResolvedValue([]),
  getAllDolencias: jest.fn().mockResolvedValue([]),
  getDolenciasById: jest.fn().mockResolvedValue(null),
  createDolencias: jest.fn().mockResolvedValue({}),
  updateDolencias: jest.fn().mockResolvedValue([0]),
  deleteDolencias: jest.fn().mockResolvedValue(0),
  getPendingDolencias: jest.fn().mockResolvedValue([]),
  approveDolencias: jest.fn().mockResolvedValue({}),
  rejectDolencias: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../src/services/usuarioService', () => ({
  getAllUsuarios: jest.fn().mockResolvedValue([]),
  getUsuarioById: jest.fn().mockResolvedValue(null),
  getUsuarioByEmail: jest.fn().mockResolvedValue(null),
  createUsuario: jest.fn().mockResolvedValue({}),
  updateUsuario: jest.fn().mockResolvedValue([0]),
  deleteUsuario: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../src/services/nlpService', () => ({
  normalize: jest.fn(t => t),
  cosineSimilarity: jest.fn().mockReturnValue(0),
  generateEmbedding: jest.fn().mockResolvedValue([]),
  queryWithExplanation: jest.fn().mockResolvedValue({ ids: [], explicacion: 'test', imagenes: [] }),
  queryPreview: jest.fn().mockResolvedValue({ pregunta: '', resultados: [], total: 0 }),
  getChatHistory: jest.fn().mockResolvedValue({ historial: [] }),
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
  uploadFile: jest.fn().mockResolvedValue('test.jpg'),
}));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const rutas = require('../../src/config_rutas');
app.use(rutas);
const { errorHandler } = require('../../src/middleware/errorHandler');
app.use(errorHandler);

describe('Validation Middleware', () => {
  describe('Poha validation', () => {
    it('should reject non-numeric idpoha param', async () => {
      const res = await request(app).get('/api/pohapp/poha/get/abc');
      expect(res.status).toBe(400);
    });

    it('should reject idpoha = 0', async () => {
      const res = await request(app).get('/api/pohapp/poha/get/0');
      expect(res.status).toBe(400);
    });

    it('should reject negative idpoha', async () => {
      const res = await request(app).get('/api/pohapp/poha/get/-1');
      expect(res.status).toBe(400);
    });

    it('should reject empty preparado on create', async () => {
      const res = await request(app)
        .post('/api/pohapp/poha/post/')
        .send({ preparado: '', recomendacion: 'test' });
      expect(res.status).toBe(400);
    });

    it('should reject empty recomendacion on create', async () => {
      const res = await request(app)
        .post('/api/pohapp/poha/post/')
        .send({ preparado: 'test', recomendacion: '' });
      expect(res.status).toBe(400);
    });

    it('should reject moderation without idusuario', async () => {
      const res = await request(app)
        .put('/api/pohapp/poha/aprobar/1')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject pendientes without idusuario query', async () => {
      const res = await request(app).get('/api/pohapp/poha/pendientes');
      expect(res.status).toBe(400);
    });
  });

  describe('Planta validation', () => {
    it('should reject non-numeric idplanta', async () => {
      const res = await request(app).get('/api/pohapp/planta/get/abc');
      expect(res.status).toBe(400);
    });

    it('should reject create without nombre', async () => {
      const res = await request(app)
        .post('/api/pohapp/planta/post/')
        .send({ descripcion: 'test' });
      expect(res.status).toBe(400);
    });

    it('should reject create without descripcion', async () => {
      const res = await request(app)
        .post('/api/pohapp/planta/post/')
        .send({ nombre: 'test' });
      expect(res.status).toBe(400);
    });

    it('should reject moderation without idusuario', async () => {
      const res = await request(app)
        .put('/api/pohapp/planta/aprobar/1')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('Dolencias validation', () => {
    it('should reject non-numeric iddolencias', async () => {
      const res = await request(app).get('/api/pohapp/dolencias/get/abc');
      expect(res.status).toBe(400);
    });

    it('should reject create without descripcion', async () => {
      const res = await request(app)
        .post('/api/pohapp/dolencias/post/')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject empty descripcion', async () => {
      const res = await request(app)
        .post('/api/pohapp/dolencias/post/')
        .send({ descripcion: '' });
      expect(res.status).toBe(400);
    });

    it('should reject moderation without idusuario', async () => {
      const res = await request(app)
        .put('/api/pohapp/dolencias/aprobar/1')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('Usuario validation', () => {
    it('should reject create without idusuario', async () => {
      const res = await request(app)
        .post('/api/pohapp/usuario/post/')
        .send({ nombre: 'Test', correo: 'test@test.com' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid email format on correo endpoint', async () => {
      const res = await request(app).get('/api/pohapp/usuario/correo/not-email');
      expect(res.status).toBe(400);
    });

    it('should reject invalid email in create body', async () => {
      const res = await request(app)
        .post('/api/pohapp/usuario/post/')
        .send({ idusuario: 'u1', correo: 'invalid-email' });
      expect(res.status).toBe(400);
    });
  });

  describe('NLP validation', () => {
    it('should reject explica without pregunta', async () => {
      const res = await request(app)
        .post('/api/pohapp/query-nlp/explica')
        .send({ idusuario: 'user1' });
      expect(res.status).toBe(400);
    });

    it('should reject explica without idusuario', async () => {
      const res = await request(app)
        .post('/api/pohapp/query-nlp/explica')
        .send({ pregunta: 'test' });
      expect(res.status).toBe(400);
    });

    it('should reject preview without pregunta', async () => {
      const res = await request(app)
        .post('/api/pohapp/query-nlp/preview')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject explica with empty pregunta', async () => {
      const res = await request(app)
        .post('/api/pohapp/query-nlp/explica')
        .send({ pregunta: '', idusuario: 'user1' });
      expect(res.status).toBe(400);
    });
  });
});
