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

const mockModerate = jest.fn().mockResolvedValue({ status: 'allowed' });
const mockModerateOrDegrade = jest.fn().mockResolvedValue({ degraded: false, result: { status: 'allowed' } });
jest.mock('../../src/services/contentModerationService', () => ({
  moderateActivation: mockModerate,
  moderateActivationOrDegrade: mockModerateOrDegrade,
}));

jest.mock('../../src/services/embeddingRegenService', () => ({
  regenerateEmbeddingsForDolencia: jest.fn().mockResolvedValue({ status: 'ok' }),
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
      mockCreate.mockResolvedValue({ iddolencias: 5, descripcion: 'Test', estado: 'PE' });

      await dolenciasService.createDolencias(
        { descripcion: 'Test', idusuario: 'user1' },
        { isAdmin: 0 },
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'PE' })
      );
    });

    it('should create dolencia with AC estado for admin', async () => {
      mockCreate.mockResolvedValue({ iddolencias: 6, estado: 'AC' });

      await dolenciasService.createDolencias(
        { descripcion: 'Admin test', idusuario: 'admin1' },
        { isAdmin: 1 },
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'AC' })
      );
    });

    it('should create dolencia with PE estado when moderation is unavailable', async () => {
      mockModerateOrDegrade.mockResolvedValueOnce({ degraded: true });
      mockCreate.mockResolvedValue({ iddolencias: 7, estado: 'PE' });

      await dolenciasService.createDolencias(
        { descripcion: 'Admin test' },
        { isAdmin: 1 },
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'PE' })
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
    it('should return pending dolencias ordered by id desc', async () => {
      mockFindAll.mockResolvedValue([{ iddolencias: 1, estado: 'PE' }]);
      const result = await dolenciasService.getPendingDolencias();
      expect(result).toHaveLength(1);
      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: 'PE' } })
      );
    });
  });

  describe('approveDolencias', () => {
    const pendingDolencia = {
      toJSON: () => ({ iddolencias: 1, descripcion: 'Dolor de cabeza', estado: 'PE' }),
    };

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(dolenciasService.approveDolencias(999))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('should approve dolencia when moderation allows the content', async () => {
      mockFindByPk.mockResolvedValue(pendingDolencia);
      mockUpdate.mockResolvedValue([1]);
      const result = await dolenciasService.approveDolencias(1);
      expect(result.message).toContain('aprobada');
      expect(mockModerate).toHaveBeenCalledWith(
        'dolencia',
        expect.objectContaining({ estado: 'AC' }),
        { iddolencias: 1 },
      );
    });

    it('should throw 503 when moderation is unavailable on approve', async () => {
      mockFindByPk.mockResolvedValue(pendingDolencia);
      const unavailableError = Object.assign(new Error('no disponible'), {
        statusCode: 503,
        code: 'MODERATION_UNAVAILABLE',
      });
      mockModerate.mockRejectedValueOnce(unavailableError);

      await expect(dolenciasService.approveDolencias(1))
        .rejects.toMatchObject({ statusCode: 503, code: 'MODERATION_UNAVAILABLE' });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('rejectDolencias', () => {
    it('should reject pending dolencia', async () => {
      mockUpdate.mockResolvedValue([1]);
      const result = await dolenciasService.rejectDolencias(1);
      expect(result.message).toContain('rechazada');
    });
  });
});
