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
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked AI response about plants' } }],
        }),
      },
    },
  })),
}));

const nlpService = require('../../src/services/nlpService');

describe('nlpService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalize', () => {
    it('should lowercase text', () => {
      expect(nlpService.normalize('HELLO WORLD')).toBe('hello world');
    });

    it('should normalize unicode (NFKD)', () => {
      const result = nlpService.normalize('cafe');
      expect(result).toBe('cafe');
    });

    it('should collapse multiple spaces', () => {
      expect(nlpService.normalize('hello    world')).toBe('hello world');
    });

    it('should trim whitespace', () => {
      expect(nlpService.normalize('  hello  ')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(nlpService.normalize('')).toBe('');
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 0, 0];
      const result = nlpService.cosineSimilarity(vec, vec);
      expect(result).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const result = nlpService.cosineSimilarity(vec1, vec2);
      expect(result).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [-1, 0];
      const result = nlpService.cosineSimilarity(vec1, vec2);
      expect(result).toBeCloseTo(-1, 5);
    });

    it('should handle arbitrary vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [4, 5, 6];
      const result = nlpService.cosineSimilarity(vec1, vec2);
      // Known value: (4+10+18) / (sqrt(14)*sqrt(77)) ≈ 0.9746
      expect(result).toBeCloseTo(0.9746, 3);
    });
  });

  describe('generateEmbedding', () => {
    it('should call OpenAI and return embedding vector', async () => {
      const result = await nlpService.generateEmbedding('test text');
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1536);
    });
  });

  describe('queryWithExplanation', () => {
    it('should return structured response with no matches', async () => {
      const database = require('../../src/database');
      // Mock getStoredEmbeddings to return empty
      database.query.mockResolvedValue([[]]);

      const result = await nlpService.queryWithExplanation('test question', 'user1');
      expect(result).toHaveProperty('ids');
      expect(result).toHaveProperty('explicacion');
      expect(result.ids).toEqual([]);
    });
  });

  describe('queryPreview', () => {
    it('should return structured response', async () => {
      const database = require('../../src/database');
      database.query.mockResolvedValue([[]]);

      const result = await nlpService.queryPreview('dolor de cabeza');
      expect(result).toHaveProperty('pregunta');
      expect(result).toHaveProperty('resultados');
      expect(result).toHaveProperty('total');
    });
  });

  describe('getChatHistory', () => {
    it('should return chat history for user', async () => {
      const database = require('../../src/database');
      database.query.mockResolvedValue([[
        { id: 1, pregunta: 'test', respuesta: 'answer', fecha: '2026-01-01' },
      ]]);

      const result = await nlpService.getChatHistory('user1');
      expect(result).toHaveProperty('historial');
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('chat_historial'),
        expect.objectContaining({
          replacements: { idusuario: 'user1' },
        })
      );
    });
  });
});
