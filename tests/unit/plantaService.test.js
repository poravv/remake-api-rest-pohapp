const mockFindAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDestroy = jest.fn();

jest.mock('../../src/model/planta', () => ({
  findAll: mockFindAll,
  findByPk: mockFindByPk,
  create: mockCreate,
  update: mockUpdate,
  destroy: mockDestroy,
}));

const mockUsuarioFindByPk = jest.fn();
jest.mock('../../src/model/usuario', () => ({
  findByPk: mockUsuarioFindByPk,
}));

jest.mock('../../src/database', () => ({
  query: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/middleware/cache', () => ({
  invalidateByPrefix: jest.fn(),
}));

jest.mock('sequelize', () => ({
  QueryTypes: { SELECT: 'SELECT' },
}));

const mockModerate = jest.fn().mockResolvedValue({ status: 'allowed' });
const mockModerateOrDegrade = jest.fn().mockResolvedValue({ degraded: false, result: { status: 'allowed' } });
jest.mock('../../src/services/contentModerationService', () => ({
  moderateActivation: mockModerate,
  moderateActivationOrDegrade: mockModerateOrDegrade,
}));

jest.mock('../../src/services/embeddingRegenService', () => ({
  regenerateEmbeddingsForPlanta: jest.fn().mockResolvedValue({ status: 'ok' }),
}));

const plantaService = require('../../src/services/plantaService');

describe('plantaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchByNombre', () => {
    it('should search plantas by nombre', async () => {
      const database = require('../../src/database');
      database.query.mockResolvedValue([{ idplanta: 1, nombre: 'Menta' }]);

      const result = await plantaService.searchByNombre('Menta');
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('nombre'),
        expect.objectContaining({
          replacements: { nombre: '%Menta%' },
        })
      );
    });
  });

  describe('getAllPlantas', () => {
    it('should return active plantas', async () => {
      const mockData = [{ idplanta: 1, nombre: 'Menta', estado: 'AC' }];
      mockFindAll.mockResolvedValue(mockData);

      const result = await plantaService.getAllPlantas();
      expect(result).toEqual(mockData);
      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: 'AC' } })
      );
    });

    it('should support pagination', async () => {
      mockFindAll.mockResolvedValue([]);
      await plantaService.getAllPlantas({ limit: 10, offset: 0 });
      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 0 })
      );
    });
  });

  describe('getPlantaById', () => {
    it('should return planta by id', async () => {
      const mockPlanta = { idplanta: 1, nombre: 'Cedrón' };
      mockFindByPk.mockResolvedValue(mockPlanta);

      const result = await plantaService.getPlantaById(1);
      expect(result).toEqual(mockPlanta);
    });

    it('should return null for non-existent id', async () => {
      mockFindByPk.mockResolvedValue(null);
      const result = await plantaService.getPlantaById(999);
      expect(result).toBeNull();
    });
  });

  describe('createPlanta', () => {
    it('should create planta with PE estado for non-admin', async () => {
      mockCreate.mockResolvedValue({ idplanta: 5, nombre: 'Test', estado: 'PE' });

      await plantaService.createPlanta(
        { nombre: 'Test', descripcion: 'Test plant', idusuario: 'user1' },
        { isAdmin: 0 },
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'PE' })
      );
    });

    it('should create planta with AC estado for admin', async () => {
      mockCreate.mockResolvedValue({ idplanta: 6, nombre: 'Test', estado: 'AC' });

      await plantaService.createPlanta(
        { nombre: 'Test', descripcion: 'Test plant', idusuario: 'admin1' },
        { isAdmin: 1 },
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'AC' })
      );
    });

    it('should create planta with PE estado when moderation is unavailable', async () => {
      mockModerateOrDegrade.mockResolvedValueOnce({ degraded: true });
      mockCreate.mockResolvedValue({ idplanta: 8, estado: 'PE' });

      await plantaService.createPlanta(
        { nombre: 'Test', descripcion: 'Test plant' },
        { isAdmin: 1 },
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'PE' })
      );
    });

    it('should propagate 422 when moderation rejects the content', async () => {
      const rejectionError = Object.assign(new Error('rechazado'), {
        statusCode: 422,
        code: 'CONTENT_REJECTED',
      });
      mockModerateOrDegrade.mockRejectedValueOnce(rejectionError);

      await expect(plantaService.createPlanta(
        { nombre: 'Spam', descripcion: 'Spam' },
        { isAdmin: 1 },
      )).rejects.toMatchObject({ statusCode: 422, code: 'CONTENT_REJECTED' });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should invalidate cache after creation', async () => {
      const { invalidateByPrefix } = require('../../src/middleware/cache');
      mockCreate.mockResolvedValue({ idplanta: 7 });

      await plantaService.createPlanta({ nombre: 'X', descripcion: 'Y' });
      expect(invalidateByPrefix).toHaveBeenCalledWith('plantas');
    });
  });

  describe('updatePlanta', () => {
    it('should update planta and invalidate cache', async () => {
      mockUpdate.mockResolvedValue([1]);
      const { invalidateByPrefix } = require('../../src/middleware/cache');

      const result = await plantaService.updatePlanta(1, { nombre: 'Updated' });
      expect(mockUpdate).toHaveBeenCalledWith(
        { nombre: 'Updated' },
        { where: { idplanta: 1 } }
      );
      expect(invalidateByPrefix).toHaveBeenCalledWith('plantas');
    });
  });

  describe('deletePlanta', () => {
    it('should delete planta and invalidate cache', async () => {
      mockDestroy.mockResolvedValue(1);
      const result = await plantaService.deletePlanta(1);
      expect(mockDestroy).toHaveBeenCalledWith({ where: { idplanta: 1 } });
      expect(result).toBe(1);
    });
  });

  describe('getPendingPlantas', () => {
    it('should return pending plantas ordered by id desc', async () => {
      const pending = [{ idplanta: 1, estado: 'PE' }];
      mockFindAll.mockResolvedValue(pending);

      const result = await plantaService.getPendingPlantas();
      expect(result).toEqual(pending);
      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: 'PE' } })
      );
    });
  });

  describe('approvePlanta', () => {
    const pendingPlanta = {
      toJSON: () => ({ idplanta: 1, nombre: 'Menta', descripcion: 'Uso tradicional', estado: 'PE' }),
    };

    it('should throw 404 if not found or already approved', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(plantaService.approvePlanta(999))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('should approve planta when moderation allows the content', async () => {
      mockFindByPk.mockResolvedValue(pendingPlanta);
      mockUpdate.mockResolvedValue([1]);

      const result = await plantaService.approvePlanta(1);
      expect(result.message).toContain('aprobada');
      expect(mockModerate).toHaveBeenCalledWith(
        'planta',
        expect.objectContaining({ estado: 'AC' }),
        { idplanta: 1 },
      );
    });

    it('should throw 422 when moderation rejects the content', async () => {
      mockFindByPk.mockResolvedValue(pendingPlanta);
      const rejectionError = Object.assign(new Error('rechazado'), {
        statusCode: 422,
        code: 'CONTENT_REJECTED',
      });
      mockModerate.mockRejectedValueOnce(rejectionError);

      await expect(plantaService.approvePlanta(1))
        .rejects.toMatchObject({ statusCode: 422, code: 'CONTENT_REJECTED' });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw 503 when moderation is unavailable on approve', async () => {
      mockFindByPk.mockResolvedValue(pendingPlanta);
      const unavailableError = Object.assign(new Error('no disponible'), {
        statusCode: 503,
        code: 'MODERATION_UNAVAILABLE',
      });
      mockModerate.mockRejectedValueOnce(unavailableError);

      await expect(plantaService.approvePlanta(1))
        .rejects.toMatchObject({ statusCode: 503, code: 'MODERATION_UNAVAILABLE' });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('rejectPlanta', () => {
    it('should reject pending planta', async () => {
      mockUpdate.mockResolvedValue([1]);
      const result = await plantaService.rejectPlanta(1);
      expect(result.message).toContain('rechazada');
    });
  });
});
