/**
 * Integration tests for pohaService relation sync (plantas + dolencias).
 *
 * These tests mock Sequelize models at the unit-of-service boundary: they
 * verify the orchestration logic (transaction use, destroy+bulkCreate,
 * id validation) without talking to a real DB.
 */

const { Op } = require('sequelize');

// ---- Mock cache / openai / db ------------------------------------------------

jest.mock('../../src/middleware/cache', () => ({
  cacheMiddleware: () => (req, res, next) => next(),
  invalidateByPrefix: jest.fn(),
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({ data: [{ embedding: new Array(8).fill(0.1) }] }),
    },
  })),
}));

const mockSequelizeQuery = jest.fn().mockResolvedValue([[{ texto_entrenamiento: 'texto de prueba' }]]);

// Transaction helper: run callback with a fake transaction object
const mockFakeTransaction = { id: 'tx-fake' };
const mockSequelizeTransaction = jest.fn().mockImplementation(async (cb) => cb(mockFakeTransaction));

jest.mock('../../src/database', () => ({
  query: (...args) => mockSequelizeQuery(...args),
  transaction: (...args) => mockSequelizeTransaction(...args),
  authenticate: jest.fn().mockResolvedValue(true),
  define: jest.fn(),
}));

// ---- Mock models -------------------------------------------------------------

jest.mock('../../src/model/poha', () => ({
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
}));

jest.mock('../../src/model/poha_planta', () => ({
  destroy: jest.fn(),
  bulkCreate: jest.fn(),
}));

jest.mock('../../src/model/dolencias_poha', () => ({
  destroy: jest.fn(),
  bulkCreate: jest.fn(),
}));

jest.mock('../../src/model/planta', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../src/model/dolencias', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../src/model/autor', () => ({}));

const pohaModel = require('../../src/model/poha');
const poha_planta = require('../../src/model/poha_planta');
const dolencias_poha = require('../../src/model/dolencias_poha');
const plantaModel = require('../../src/model/planta');
const dolenciasModel = require('../../src/model/dolencias');

const pohaService = require('../../src/services/pohaService');

describe('pohaService — relations sync (plantas + dolencias)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSequelizeTransaction.mockImplementation(async (cb) => cb(mockFakeTransaction));
  });

  describe('createPoha', () => {
    it('validates plantas/dolencias existence and creates pivot rows inside a transaction', async () => {
      pohaModel.create.mockResolvedValue({ idpoha: 77, toJSON: () => ({ idpoha: 77 }) });
      pohaModel.findByPk.mockResolvedValue({
        toJSON: () => ({ idpoha: 77, plantas: [1, 2], dolencias: [10] }),
      });
      plantaModel.findAll.mockResolvedValue([{ idplanta: 1 }, { idplanta: 2 }]);
      dolenciasModel.findAll.mockResolvedValue([{ iddolencias: 10 }]);
      poha_planta.bulkCreate.mockResolvedValue([]);
      dolencias_poha.bulkCreate.mockResolvedValue([]);

      const result = await pohaService.createPoha(
        {
          preparado: 'te de cedron',
          recomendacion: 'tibio',
          idusuario: 'user-1',
          plantas: [1, 2],
          dolencias: [10],
        },
        { isAdmin: 1 },
      );

      expect(mockSequelizeTransaction).toHaveBeenCalledTimes(1);

      expect(plantaModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { idplanta: { [Op.in]: [1, 2] } },
        transaction: mockFakeTransaction,
      }));
      expect(dolenciasModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { iddolencias: { [Op.in]: [10] } },
        transaction: mockFakeTransaction,
      }));

      expect(pohaModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ preparado: 'te de cedron', estado: 'AC' }),
        { transaction: mockFakeTransaction },
      );

      expect(poha_planta.destroy).toHaveBeenCalledWith({ where: { idpoha: 77 }, transaction: mockFakeTransaction });
      expect(poha_planta.bulkCreate).toHaveBeenCalledWith(
        [
          { idpoha: 77, idplanta: 1, idusuario: 'user-1' },
          { idpoha: 77, idplanta: 2, idusuario: 'user-1' },
        ],
        { transaction: mockFakeTransaction },
      );

      expect(dolencias_poha.destroy).toHaveBeenCalledWith({ where: { idpoha: 77 }, transaction: mockFakeTransaction });
      expect(dolencias_poha.bulkCreate).toHaveBeenCalledWith(
        [{ idpoha: 77, iddolencias: 10, idusuario: 'user-1' }],
        { transaction: mockFakeTransaction },
      );

      expect(result.idpoha).toBe(77);
      expect(result.embeddingGuardado).toBe(true);
    });

    it('rejects with 400 when a referenced planta id does not exist', async () => {
      pohaModel.create.mockResolvedValue({ idpoha: 77, toJSON: () => ({ idpoha: 77 }) });
      plantaModel.findAll.mockResolvedValue([{ idplanta: 1 }]); // only 1, not 2

      await expect(
        pohaService.createPoha(
          {
            preparado: 'x', recomendacion: 'y',
            idusuario: 'u1',
            plantas: [1, 2],
          },
          { isAdmin: 1 },
        ),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(pohaModel.create).not.toHaveBeenCalled();
      expect(poha_planta.bulkCreate).not.toHaveBeenCalled();
    });

    it('skips pivot sync when plantas/dolencias are not provided', async () => {
      pohaModel.create.mockResolvedValue({ idpoha: 99, toJSON: () => ({ idpoha: 99 }) });
      pohaModel.findByPk.mockResolvedValue({ toJSON: () => ({ idpoha: 99 }) });

      await pohaService.createPoha(
        { preparado: 'x', recomendacion: 'y', idusuario: 'u2' },
        { isAdmin: 1 },
      );

      expect(plantaModel.findAll).not.toHaveBeenCalled();
      expect(dolenciasModel.findAll).not.toHaveBeenCalled();
      expect(poha_planta.destroy).not.toHaveBeenCalled();
      expect(dolencias_poha.destroy).not.toHaveBeenCalled();
    });

    it('accepts empty arrays and clears existing pivot rows', async () => {
      pohaModel.create.mockResolvedValue({ idpoha: 55, toJSON: () => ({ idpoha: 55 }) });
      pohaModel.findByPk.mockResolvedValue({ toJSON: () => ({ idpoha: 55 }) });

      await pohaService.createPoha(
        { preparado: 'x', recomendacion: 'y', idusuario: 'u3', plantas: [], dolencias: [] },
        { isAdmin: 1 },
      );

      expect(poha_planta.destroy).toHaveBeenCalledWith({ where: { idpoha: 55 }, transaction: mockFakeTransaction });
      expect(dolencias_poha.destroy).toHaveBeenCalledWith({ where: { idpoha: 55 }, transaction: mockFakeTransaction });
      expect(poha_planta.bulkCreate).not.toHaveBeenCalled();
      expect(dolencias_poha.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('updatePoha', () => {
    it('updates scalar fields and replaces pivot rows atomically', async () => {
      pohaModel.update.mockResolvedValue([1]);
      pohaModel.findByPk.mockResolvedValue({ toJSON: () => ({ idpoha: 12, plantas: [3] }) });
      plantaModel.findAll.mockResolvedValue([{ idplanta: 3 }]);
      dolenciasModel.findAll.mockResolvedValue([{ iddolencias: 20 }, { iddolencias: 21 }]);

      const result = await pohaService.updatePoha(12, {
        preparado: 'nuevo preparado',
        plantas: [3],
        dolencias: [20, 21],
        idusuario: 'editor-1',
      });

      expect(mockSequelizeTransaction).toHaveBeenCalled();
      expect(pohaModel.update).toHaveBeenCalledWith(
        expect.objectContaining({ preparado: 'nuevo preparado', idusuario: 'editor-1' }),
        { where: { idpoha: 12 }, transaction: mockFakeTransaction },
      );
      expect(poha_planta.destroy).toHaveBeenCalledWith({ where: { idpoha: 12 }, transaction: mockFakeTransaction });
      expect(poha_planta.bulkCreate).toHaveBeenCalledWith(
        [{ idpoha: 12, idplanta: 3, idusuario: 'editor-1' }],
        { transaction: mockFakeTransaction },
      );
      expect(dolencias_poha.bulkCreate).toHaveBeenCalledWith(
        [
          { idpoha: 12, iddolencias: 20, idusuario: 'editor-1' },
          { idpoha: 12, iddolencias: 21, idusuario: 'editor-1' },
        ],
        { transaction: mockFakeTransaction },
      );
      expect(result.idpoha).toBe(12);
    });

    it('does not call poha.update when only pivot arrays are provided', async () => {
      pohaModel.findByPk.mockResolvedValue({ toJSON: () => ({ idpoha: 13 }) });
      plantaModel.findAll.mockResolvedValue([{ idplanta: 5 }]);

      await pohaService.updatePoha(13, { plantas: [5] });

      expect(pohaModel.update).not.toHaveBeenCalled();
      expect(poha_planta.bulkCreate).toHaveBeenCalled();
    });

    it('rejects with 400 when a referenced dolencia id does not exist', async () => {
      dolenciasModel.findAll.mockResolvedValue([]);

      await expect(pohaService.updatePoha(14, { dolencias: [999] })).rejects.toMatchObject({
        statusCode: 400,
      });

      expect(pohaModel.update).not.toHaveBeenCalled();
      expect(dolencias_poha.bulkCreate).not.toHaveBeenCalled();
    });
  });
});
