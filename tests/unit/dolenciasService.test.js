const mockFindAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDestroy = jest.fn();

jest.mock('../../src/model/dolencias', () => ({
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

const dolenciasService = require('../../src/services/dolenciasService');

describe('dolenciasService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchByDescripcion', () => {
    it('should search dolencias by descripcion', async () => {
      const database = require('../../src/database');
      database.query.mockResolvedValue([{ iddolencias: 1, descripcion: 'Dolor de cabeza' }]);

      await dolenciasService.searchByDescripcion('cabeza');
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('descripcion'),
        expect.objectContaining({
          replacements: { descripcion: '%cabeza%' },
        })
      );
    });
  });

  describe('getAllDolencias', () => {
    it('should return active dolencias', async () => {
      const data = [{ iddolencias: 1, descripcion: 'Fiebre', estado: 'AC' }];
      mockFindAll.mockResolvedValue(data);

      const result = await dolenciasService.getAllDolencias();
      expect(result).toEqual(data);
      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: 'AC' } })
      );
    });
  });

  describe('getDolenciasById', () => {
    it('should return dolencia by id', async () => {
      const mockData = { iddolencias: 1, descripcion: 'Fiebre' };
      mockFindByPk.mockResolvedValue(mockData);
      const result = await dolenciasService.getDolenciasById(1);
      expect(result).toEqual(mockData);
    });

    it('should return null for non-existent id', async () => {
      mockFindByPk.mockResolvedValue(null);
      const result = await dolenciasService.getDolenciasById(999);
      expect(result).toBeNull();
    });
  });

  describe('createDolencias', () => {
    it('should create dolencia with PE estado for non-admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });
      mockCreate.mockResolvedValue({ iddolencias: 5, descripcion: 'Test', estado: 'PE' });

      await dolenciasService.createDolencias({
        descripcion: 'Test',
        idusuario: 'user1',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'PE' })
      );
    });

    it('should create dolencia with AC estado for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockCreate.mockResolvedValue({ iddolencias: 6, estado: 'AC' });

      await dolenciasService.createDolencias({
        descripcion: 'Admin test',
        idusuario: 'admin1',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'AC' })
      );
    });
  });

  describe('updateDolencias', () => {
    it('should update and invalidate cache', async () => {
      mockUpdate.mockResolvedValue([1]);
      const { invalidateByPrefix } = require('../../src/middleware/cache');

      await dolenciasService.updateDolencias(1, { descripcion: 'Updated' });
      expect(mockUpdate).toHaveBeenCalledWith(
        { descripcion: 'Updated' },
        { where: { iddolencias: 1 } }
      );
      expect(invalidateByPrefix).toHaveBeenCalledWith('dolencias');
    });
  });

  describe('deleteDolencias', () => {
    it('should delete and invalidate cache', async () => {
      mockDestroy.mockResolvedValue(1);
      const result = await dolenciasService.deleteDolencias(1);
      expect(result).toBe(1);
    });
  });

  describe('getPendingDolencias', () => {
    it('should throw 403 for non-admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });
      await expect(dolenciasService.getPendingDolencias('user1'))
        .rejects.toThrow('Acceso denegado');
    });

    it('should return pending dolencias for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockFindAll.mockResolvedValue([{ iddolencias: 1, estado: 'PE' }]);
      const result = await dolenciasService.getPendingDolencias('admin1');
      expect(result).toHaveLength(1);
    });
  });

  describe('approveDolencias', () => {
    it('should throw 403 for non-admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });
      await expect(dolenciasService.approveDolencias(1, 'user1'))
        .rejects.toThrow('Acceso denegado');
    });

    it('should throw 404 if not found', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockUpdate.mockResolvedValue([0]);
      await expect(dolenciasService.approveDolencias(999, 'admin1'))
        .rejects.toThrow();
    });

    it('should approve dolencia for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockUpdate.mockResolvedValue([1]);
      const result = await dolenciasService.approveDolencias(1, 'admin1');
      expect(result.message).toContain('aprobada');
    });
  });

  describe('rejectDolencias', () => {
    it('should reject dolencia for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockUpdate.mockResolvedValue([1]);
      const result = await dolenciasService.rejectDolencias(1, 'admin1');
      expect(result.message).toContain('rechazada');
    });
  });
});
