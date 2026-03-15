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
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });
      mockCreate.mockResolvedValue({ idplanta: 5, nombre: 'Test', estado: 'PE' });

      await plantaService.createPlanta({
        nombre: 'Test',
        descripcion: 'Test plant',
        idusuario: 'user1',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'PE' })
      );
    });

    it('should create planta with AC estado for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockCreate.mockResolvedValue({ idplanta: 6, nombre: 'Test', estado: 'AC' });

      await plantaService.createPlanta({
        nombre: 'Test',
        descripcion: 'Test plant',
        idusuario: 'admin1',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'AC' })
      );
    });

    it('should invalidate cache after creation', async () => {
      const { invalidateByPrefix } = require('../../src/middleware/cache');
      mockUsuarioFindByPk.mockResolvedValue(null);
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
    it('should throw 403 for non-admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });
      await expect(plantaService.getPendingPlantas('user1'))
        .rejects.toThrow('Acceso denegado');
    });

    it('should return pending plantas for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      const pending = [{ idplanta: 1, estado: 'PE' }];
      mockFindAll.mockResolvedValue(pending);

      const result = await plantaService.getPendingPlantas('admin1');
      expect(result).toEqual(pending);
    });
  });

  describe('approvePlanta', () => {
    it('should throw 403 for non-admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });
      await expect(plantaService.approvePlanta(1, 'user1'))
        .rejects.toThrow('Acceso denegado');
    });

    it('should throw 404 if not found', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockUpdate.mockResolvedValue([0]);
      await expect(plantaService.approvePlanta(999, 'admin1'))
        .rejects.toThrow();
    });

    it('should approve planta for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockUpdate.mockResolvedValue([1]);
      const result = await plantaService.approvePlanta(1, 'admin1');
      expect(result.message).toContain('aprobada');
    });
  });

  describe('rejectPlanta', () => {
    it('should reject planta for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockUpdate.mockResolvedValue([1]);
      const result = await plantaService.rejectPlanta(1, 'admin1');
      expect(result.message).toContain('rechazada');
    });
  });
});
