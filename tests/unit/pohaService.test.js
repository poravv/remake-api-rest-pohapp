// Mock all external dependencies before requiring the service
const mockFindAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDestroy = jest.fn();
const mockCount = jest.fn();

jest.mock('../../src/model/poha', () => {
  const model = {
    findAll: mockFindAll,
    findByPk: mockFindByPk,
    create: mockCreate,
    update: mockUpdate,
    destroy: mockDestroy,
    count: mockCount,
  };
  return model;
});

jest.mock('../../src/model/dolencias_poha', () => ({
  destroy: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../src/model/poha_planta', () => ({
  destroy: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../src/model/autor', () => ({}));
jest.mock('../../src/model/planta', () => ({}));
jest.mock('../../src/model/dolencias', () => ({}));

const mockUsuarioFindByPk = jest.fn();
jest.mock('../../src/model/usuario', () => ({
  findByPk: mockUsuarioFindByPk,
}));

jest.mock('../../src/database', () => ({
  query: jest.fn().mockResolvedValue([[{ texto_entrenamiento: 'test training text' }]]),
}));

jest.mock('../../src/middleware/cache', () => ({
  invalidateByPrefix: jest.fn(),
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  })),
}));

jest.mock('sequelize', () => ({
  Op: { and: Symbol('and'), in: Symbol('in') },
}));

const pohaService = require('../../src/services/pohaService');

describe('pohaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('countPoha', () => {
    it('should return count from model', async () => {
      mockCount.mockResolvedValue(42);
      const result = await pohaService.countPoha();
      expect(result).toBe(42);
      expect(mockCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllPoha', () => {
    it('should return all active poha', async () => {
      const mockData = [{ idpoha: 1, preparado: 'test' }];
      mockFindAll.mockResolvedValue(mockData);

      const result = await pohaService.getAllPoha();
      expect(result).toEqual(mockData);
      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { estado: 'AC' },
          distinct: true,
        })
      );
    });

    it('should pass pagination params', async () => {
      mockFindAll.mockResolvedValue([]);
      const pagination = { limit: 10, offset: 0 };

      await pohaService.getAllPoha(pagination);
      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
        })
      );
    });
  });

  describe('getPohaById', () => {
    it('should return poha by id', async () => {
      const mockPoha = { idpoha: 1, preparado: 'mate con menta' };
      mockFindByPk.mockResolvedValue(mockPoha);

      const result = await pohaService.getPohaById(1);
      expect(result).toEqual(mockPoha);
      expect(mockFindByPk).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should return null for non-existent id', async () => {
      mockFindByPk.mockResolvedValue(null);
      const result = await pohaService.getPohaById(999);
      expect(result).toBeNull();
    });
  });

  describe('createPoha', () => {
    it('should create poha with PE estado for non-admin user', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });
      mockCreate.mockResolvedValue({
        idpoha: 10,
        toJSON: () => ({ idpoha: 10, preparado: 'test', estado: 'PE' }),
      });

      const result = await pohaService.createPoha({
        preparado: 'test',
        recomendacion: 'test rec',
        idusuario: 'user1',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'PE' })
      );
      expect(result).toBeDefined();
    });

    it('should create poha with AC estado for admin user', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockCreate.mockResolvedValue({
        idpoha: 11,
        toJSON: () => ({ idpoha: 11, preparado: 'admin test', estado: 'AC' }),
      });

      await pohaService.createPoha({
        preparado: 'admin test',
        recomendacion: 'rec',
        idusuario: 'admin1',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'AC' })
      );
    });
  });

  describe('updatePoha', () => {
    it('should update poha and invalidate cache', async () => {
      mockUpdate.mockResolvedValue([1]);
      const { invalidateByPrefix } = require('../../src/middleware/cache');

      const result = await pohaService.updatePoha(1, { preparado: 'updated' });
      expect(mockUpdate).toHaveBeenCalledWith(
        { preparado: 'updated' },
        { where: { idpoha: 1 } }
      );
      expect(invalidateByPrefix).toHaveBeenCalledWith('poha');
      expect(result).toEqual([1]);
    });
  });

  describe('deletePoha', () => {
    it('should delete related records and then the poha', async () => {
      const dolenciasPoha = require('../../src/model/dolencias_poha');
      const pohaPlanta = require('../../src/model/poha_planta');
      mockDestroy.mockResolvedValue(1);

      const result = await pohaService.deletePoha(5);
      expect(pohaPlanta.destroy).toHaveBeenCalledWith({ where: { idpoha: 5 } });
      expect(dolenciasPoha.destroy).toHaveBeenCalledWith({ where: { idpoha: 5 } });
      expect(mockDestroy).toHaveBeenCalledWith({ where: { idpoha: 5 } });
      expect(result).toBe(1);
    });
  });

  describe('getPendingPoha', () => {
    it('should throw 403 for non-admin user', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });

      await expect(pohaService.getPendingPoha('user1'))
        .rejects.toThrow('Acceso denegado');
    });

    it('should return pending poha for admin user', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      const pending = [{ idpoha: 1, estado: 'PE' }];
      mockFindAll.mockResolvedValue(pending);

      const result = await pohaService.getPendingPoha('admin1');
      expect(result).toEqual(pending);
    });
  });

  describe('approvePoha', () => {
    it('should throw 403 for non-admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });

      await expect(pohaService.approvePoha(1, 'user1'))
        .rejects.toThrow('Acceso denegado');
    });

    it('should throw 404 if poha not found or already approved', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockUpdate.mockResolvedValue([0]);

      await expect(pohaService.approvePoha(999, 'admin1'))
        .rejects.toThrow('no encontrado');
    });

    it('should approve poha for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockUpdate.mockResolvedValue([1]);

      const result = await pohaService.approvePoha(1, 'admin1');
      expect(result.message).toContain('aprobado');
    });
  });

  describe('rejectPoha', () => {
    it('should throw 403 for non-admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 0 });

      await expect(pohaService.rejectPoha(1, 'user1'))
        .rejects.toThrow('Acceso denegado');
    });

    it('should reject poha for admin', async () => {
      mockUsuarioFindByPk.mockResolvedValue({ isAdmin: 1 });
      mockUpdate.mockResolvedValue([1]);

      const result = await pohaService.rejectPoha(1, 'admin1');
      expect(result.message).toContain('rechazado');
    });
  });
});
