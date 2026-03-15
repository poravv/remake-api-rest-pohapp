const request = require('supertest');
const express = require('express');

// Mock cache middleware to be a no-op
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

// Mock the service layer
const mockPohaService = {
  countPoha: jest.fn(),
  getAllPoha: jest.fn(),
  getPohaById: jest.fn(),
  getPohaFiltered: jest.fn(),
  getPohaFilteredPaginated: jest.fn(),
  createPoha: jest.fn(),
  updatePoha: jest.fn(),
  deletePoha: jest.fn(),
  getPendingPoha: jest.fn(),
  approvePoha: jest.fn(),
  rejectPoha: jest.fn(),
};
jest.mock('../../src/services/pohaService', () => mockPohaService);

// Mock other services that config_rutas loads
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

// Mock database and models used by remaining route files
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

describe('Poha Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pohapp/poha/count/', () => {
    it('should return count (200)', async () => {
      mockPohaService.countPoha.mockResolvedValue(42);
      const res = await request(app).get('/api/pohapp/poha/count/');
      expect(res.status).toBe(200);
      expect(res.body).toBe(42);
    });

    it('should return 500 on service error', async () => {
      mockPohaService.countPoha.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/api/pohapp/poha/count/');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/pohapp/poha/get/', () => {
    it('should return all poha (200)', async () => {
      const data = [{ idpoha: 1, preparado: 'test' }];
      mockPohaService.getAllPoha.mockResolvedValue(data);
      const res = await request(app).get('/api/pohapp/poha/get/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(data);
    });
  });

  describe('GET /api/pohapp/poha/get/:idpoha', () => {
    it('should return poha by id (200)', async () => {
      const data = { idpoha: 1, preparado: 'mate' };
      mockPohaService.getPohaById.mockResolvedValue(data);
      const res = await request(app).get('/api/pohapp/poha/get/1');
      expect(res.status).toBe(200);
    });

    it('should return 400 for non-numeric id', async () => {
      const res = await request(app).get('/api/pohapp/poha/get/abc');
      expect(res.status).toBe(400);
    });

    it('should return 400 for id < 1', async () => {
      const res = await request(app).get('/api/pohapp/poha/get/0');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/pohapp/poha/post/', () => {
    it('should create poha with valid data (200)', async () => {
      mockPohaService.createPoha.mockResolvedValue({ idpoha: 10, preparado: 'test' });
      const res = await request(app)
        .post('/api/pohapp/poha/post/')
        .send({ preparado: 'mate con menta', recomendacion: 'tomar tibio' });
      expect(res.status).toBe(200);
    });

    it('should return 400 for missing preparado', async () => {
      const res = await request(app)
        .post('/api/pohapp/poha/post/')
        .send({ recomendacion: 'tomar tibio' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing recomendacion', async () => {
      const res = await request(app)
        .post('/api/pohapp/poha/post/')
        .send({ preparado: 'mate con menta' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for empty body', async () => {
      const res = await request(app)
        .post('/api/pohapp/poha/post/')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/pohapp/poha/put/:idpoha', () => {
    it('should update poha (200)', async () => {
      mockPohaService.updatePoha.mockResolvedValue([1]);
      const res = await request(app)
        .put('/api/pohapp/poha/put/1')
        .send({ preparado: 'updated' });
      expect(res.status).toBe(200);
    });

    it('should return 400 for non-numeric id', async () => {
      const res = await request(app)
        .put('/api/pohapp/poha/put/abc')
        .send({ preparado: 'updated' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/pohapp/poha/delete/:idpoha', () => {
    it('should delete poha (200)', async () => {
      mockPohaService.deletePoha.mockResolvedValue(1);
      const res = await request(app).delete('/api/pohapp/poha/delete/1');
      expect(res.status).toBe(200);
    });

    it('should return 400 for non-numeric id', async () => {
      const res = await request(app).delete('/api/pohapp/poha/delete/abc');
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/pohapp/poha/aprobar/:idpoha', () => {
    it('should approve poha (200)', async () => {
      mockPohaService.approvePoha.mockResolvedValue({ message: 'aprobado' });
      const res = await request(app)
        .put('/api/pohapp/poha/aprobar/1')
        .send({ idusuario: 'admin1' });
      expect(res.status).toBe(200);
    });

    it('should return 400 without idusuario', async () => {
      const res = await request(app)
        .put('/api/pohapp/poha/aprobar/1')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
