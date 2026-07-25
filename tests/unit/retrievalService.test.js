jest.mock('../../src/database', () => ({
  query: jest.fn().mockResolvedValue([[]]),
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

const retrievalService = require('../../src/services/retrievalService');

describe('retrievalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    retrievalService.invalidateVectorCache();
  });

  describe('normalize', () => {
    it('should lowercase text', () => {
      expect(retrievalService.normalize('HELLO WORLD')).toBe('hello world');
    });

    it('should normalize unicode (NFKD)', () => {
      const result = retrievalService.normalize('cafe');
      expect(result).toBe('cafe');
    });

    it('should collapse multiple spaces', () => {
      expect(retrievalService.normalize('hello    world')).toBe('hello world');
    });

    it('should trim whitespace', () => {
      expect(retrievalService.normalize('  hello  ')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(retrievalService.normalize('')).toBe('');
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 0, 0];
      const result = retrievalService.cosineSimilarity(vec, vec);
      expect(result).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const result = retrievalService.cosineSimilarity(vec1, vec2);
      expect(result).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [-1, 0];
      const result = retrievalService.cosineSimilarity(vec1, vec2);
      expect(result).toBeCloseTo(-1, 5);
    });

    it('should handle arbitrary vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [4, 5, 6];
      const result = retrievalService.cosineSimilarity(vec1, vec2);
      // Known value: (4+10+18) / (sqrt(14)*sqrt(77)) ≈ 0.9746
      expect(result).toBeCloseTo(0.9746, 3);
    });
  });

  describe('generateEmbedding', () => {
    it('should call OpenAI and return embedding vector', async () => {
      const result = await retrievalService.generateEmbedding('test text');
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1536);
    });
  });

  describe('queryPreview', () => {
    it('should return structured response', async () => {
      const database = require('../../src/database');
      database.query.mockResolvedValue([[]]);

      const result = await retrievalService.queryPreview('dolor de cabeza');
      expect(result).toHaveProperty('pregunta');
      expect(result).toHaveProperty('resultados');
      expect(result).toHaveProperty('total');
    });
  });
});
