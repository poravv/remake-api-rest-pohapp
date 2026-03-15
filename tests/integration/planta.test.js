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

const mockPlantaService = {
  searchByNombre: jest.fn(),
  getPlantasLimited: jest.fn(),
  getPlantasUsage: jest.fn(),
  getAllPlantas: jest.fn(),
  getPlantaById: jest.fn(),
  createPlanta: jest.fn(),
  updatePlanta: jest.fn(),
  deletePlanta: jest.fn(),
  getPendingPlantas: jest.fn(),
  approvePlanta: jest.fn(),
  rejectPlanta: jest.fn(),
};
jest.mock('../../src/services/plantaService', () => mockPlantaService);

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

describe('Planta Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pohapp/planta/get/', () => {
    it('should return all plantas (200)', async () => {
      const data = [{ idplanta: 1, nombre: 'Menta' }];
      mockPlantaService.getAllPlantas.mockResolvedValue(data);
      const res = await request(app).get('/api/pohapp/planta/get/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(data);
    });
  });

  describe('GET /api/pohapp/planta/get/:idplanta', () => {
    it('should return planta by id (200)', async () => {
      mockPlantaService.getPlantaById.mockResolvedValue({ idplanta: 1, nombre: 'Menta' });
      const res = await request(app).get('/api/pohapp/planta/get/1');
      expect(res.status).toBe(200);
    });

    it('should return 400 for non-numeric id', async () => {
      const res = await request(app).get('/api/pohapp/planta/get/abc');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/pohapp/planta/post/', () => {
    it('should create planta with valid data (200)', async () => {
      mockPlantaService.createPlanta.mockResolvedValue({ idplanta: 5 });
      const res = await request(app)
        .post('/api/pohapp/planta/post/')
        .send({ nombre: 'Cedron', descripcion: 'Planta aromatica' });
      expect(res.status).toBe(200);
    });

    it('should return 400 for missing nombre', async () => {
      const res = await request(app)
        .post('/api/pohapp/planta/post/')
        .send({ descripcion: 'test' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing descripcion', async () => {
      const res = await request(app)
        .post('/api/pohapp/planta/post/')
        .send({ nombre: 'test' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/pohapp/planta/put/:idplanta', () => {
    it('should update planta (200)', async () => {
      mockPlantaService.updatePlanta.mockResolvedValue([1]);
      const res = await request(app)
        .put('/api/pohapp/planta/put/1')
        .send({ nombre: 'Updated' });
      expect(res.status).toBe(200);
    });

    it('should return 400 for non-numeric id', async () => {
      const res = await request(app)
        .put('/api/pohapp/planta/put/abc')
        .send({ nombre: 'Updated' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/pohapp/planta/delete/:idplanta', () => {
    it('should delete planta (200)', async () => {
      mockPlantaService.deletePlanta.mockResolvedValue(1);
      const res = await request(app).delete('/api/pohapp/planta/delete/1');
      expect(res.status).toBe(200);
    });

    it('should return 400 for non-numeric id', async () => {
      const res = await request(app).delete('/api/pohapp/planta/delete/abc');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/pohapp/planta/getsql/:nombre', () => {
    it('should search plantas by name (200)', async () => {
      mockPlantaService.searchByNombre.mockResolvedValue([{ idplanta: 1 }]);
      const res = await request(app).get('/api/pohapp/planta/getsql/Menta');
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/pohapp/planta/aprobar/:idplanta', () => {
    it('should approve planta (200)', async () => {
      mockPlantaService.approvePlanta.mockResolvedValue({ message: 'ok' });
      const res = await request(app)
        .put('/api/pohapp/planta/aprobar/1')
        .send({ idusuario: 'admin1' });
      expect(res.status).toBe(200);
    });

    it('should return 400 without idusuario', async () => {
      const res = await request(app)
        .put('/api/pohapp/planta/aprobar/1')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
