const mockQuery = jest.fn();
const mockEmbeddingCreate = jest.fn();

jest.mock('../../src/database', () => ({ query: mockQuery }));
jest.mock('../../src/services/cacheClient', () => ({
  initRedis: jest.fn(),
  isRedisReady: jest.fn().mockReturnValue(false),
  getFromMemory: jest.fn(),
  setInMemory: jest.fn(),
}));
jest.mock('../../src/middleware/cache', () => ({
  invalidateByPrefix: jest.fn(),
}));
jest.mock('../../src/services/retrievalService', () => ({
  invalidateVectorCache: jest.fn(),
}));
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: { create: mockEmbeddingCreate },
  })),
}));

const embeddingRegen = require('../../src/services/embeddingRegenService');

describe('embeddingRegenService relation refresh', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockQuery.mockReset();
    mockEmbeddingCreate.mockReset();
    mockEmbeddingCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] });
    mockQuery.mockImplementation(async (sql, options = {}) => {
      if (/SELECT DISTINCT pp\.idpoha/i.test(sql)) {
        return [[{ idpoha: 10 }, { idpoha: 11 }]];
      }
      if (/FROM vw_medicina_entrenamiento/i.test(sql)) {
        const id = options.replacements?.idpoha;
        return [[{ idpoha: id, texto_entrenamiento: `texto ${id}`, dolencias: 'tos', stored_hash: null }]];
      }
      return [[]];
    });
  });

  it('refreshes all active pohas linked to an approved plant', async () => {
    const result = await embeddingRegen.regenerateEmbeddingsForPlanta(4);

    expect(result).toMatchObject({
      relation: 'idplanta',
      id: 4,
      total: 2,
      regenerated: 2,
      errors: 0,
    });
    expect(mockEmbeddingCreate).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[0][0]).toMatch(/p\.estado = 'AC'/);
    expect(mockQuery.mock.calls[0][1]).toEqual({ replacements: { id: 4 } });
  });
});
