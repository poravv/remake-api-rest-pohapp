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

const mockNlpService = {
  normalize: jest.fn(t => t),
  cosineSimilarity: jest.fn().mockReturnValue(0),
  generateEmbedding: jest.fn().mockResolvedValue([]),
  queryWithExplanation: jest.fn(),
  queryPreview: jest.fn(),
  getChatHistory: jest.fn(),
};
jest.mock('../../src/services/claudeNlpService', () => mockNlpService);

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

describe('NLP Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/pohapp/query-nlp/explica', () => {
    it('should return NLP explanation (200)', async () => {
      mockNlpService.queryWithExplanation.mockResolvedValue({
        ids: [1, 2],
        explicacion: 'La menta es buena para el dolor',
        imagenes: [],
      });

      const res = await request(app)
        .post('/api/pohapp/query-nlp/explica')
        .send({ pregunta: 'que planta sirve para el dolor?', idusuario: 'user1' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('explicacion');
    });

    it('should return 400 for missing pregunta', async () => {
      const res = await request(app)
        .post('/api/pohapp/query-nlp/explica')
        .send({ idusuario: 'user1' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing idusuario', async () => {
      const res = await request(app)
        .post('/api/pohapp/query-nlp/explica')
        .send({ pregunta: 'test question' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for empty body', async () => {
      const res = await request(app)
        .post('/api/pohapp/query-nlp/explica')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 500 on service error', async () => {
      mockNlpService.queryWithExplanation.mockRejectedValue(new Error('AI error'));
      const res = await request(app)
        .post('/api/pohapp/query-nlp/explica')
        .send({ pregunta: 'test', idusuario: 'user1' });
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/pohapp/query-nlp/preview', () => {
    it('should return NLP preview (200)', async () => {
      mockNlpService.queryPreview.mockResolvedValue({
        pregunta: 'dolor cabeza',
        resultados: [],
        total: 0,
      });

      const res = await request(app)
        .post('/api/pohapp/query-nlp/preview')
        .send({ pregunta: 'dolor de cabeza' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pregunta');
    });

    it('should return 400 for missing pregunta', async () => {
      const res = await request(app)
        .post('/api/pohapp/query-nlp/preview')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
