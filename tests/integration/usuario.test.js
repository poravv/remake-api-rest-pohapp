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

const mockUsuarioService = {
  getAllUsuarios: jest.fn(),
  getUsuarioById: jest.fn(),
  getUsuarioByEmail: jest.fn(),
  createUsuario: jest.fn(),
  updateUsuario: jest.fn(),
  deleteUsuario: jest.fn(),
};
jest.mock('../../src/services/usuarioService', () => mockUsuarioService);

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

describe('Usuario Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pohapp/usuario/get/', () => {
    it('should return all usuarios (200)', async () => {
      mockUsuarioService.getAllUsuarios.mockResolvedValue([{ idusuario: 'u1' }]);
      const res = await request(app).get('/api/pohapp/usuario/get/');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /api/pohapp/usuario/get/:idusuario', () => {
    it('should return usuario by id (200)', async () => {
      mockUsuarioService.getUsuarioById.mockResolvedValue({ idusuario: 'u1', nombre: 'Juan' });
      const res = await request(app).get('/api/pohapp/usuario/get/u1');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/pohapp/usuario/correo/:correo', () => {
    it('should return usuario by email (200)', async () => {
      mockUsuarioService.getUsuarioByEmail.mockResolvedValue({ idusuario: 'u1', correo: 'j@test.com' });
      const res = await request(app).get('/api/pohapp/usuario/correo/j@test.com');
      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent email', async () => {
      mockUsuarioService.getUsuarioByEmail.mockResolvedValue(null);
      const res = await request(app).get('/api/pohapp/usuario/correo/nobody@test.com');
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app).get('/api/pohapp/usuario/correo/not-an-email');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/pohapp/usuario/post/', () => {
    it('should create usuario with valid data (200)', async () => {
      mockUsuarioService.createUsuario.mockResolvedValue({ idusuario: 'u2' });
      const res = await request(app)
        .post('/api/pohapp/usuario/post/')
        .send({ idusuario: 'u2', nombre: 'Maria', correo: 'maria@test.com' });
      expect(res.status).toBe(200);
    });

    it('should return 400 for missing idusuario', async () => {
      const res = await request(app)
        .post('/api/pohapp/usuario/post/')
        .send({ nombre: 'Maria', correo: 'maria@test.com' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/pohapp/usuario/post/')
        .send({ idusuario: 'u2', correo: 'not-email' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/pohapp/usuario/put/:idusuario', () => {
    it('should update usuario (200)', async () => {
      mockUsuarioService.updateUsuario.mockResolvedValue([1]);
      const res = await request(app)
        .put('/api/pohapp/usuario/put/u1')
        .send({ nombre: 'Updated' });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/pohapp/usuario/delete/:idusuario', () => {
    it('should delete usuario (200)', async () => {
      mockUsuarioService.deleteUsuario.mockResolvedValue(1);
      const res = await request(app).delete('/api/pohapp/usuario/delete/u1');
      expect(res.status).toBe(200);
    });
  });
});
