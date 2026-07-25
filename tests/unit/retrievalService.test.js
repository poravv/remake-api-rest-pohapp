jest.mock('../../src/database', () => ({
  query: jest.fn().mockResolvedValue([[]]),
}));

// No in-memory embedding cache between tests: each generateEmbedding call
// must hit the mocked OpenAI client so per-test vectors stay controllable.
jest.mock('../../src/services/cacheClient', () => ({
  initRedis: jest.fn().mockResolvedValue(false),
  isRedisReady: jest.fn().mockReturnValue(false),
  hasRedisConfig: jest.fn().mockReturnValue(false),
  getRedisClient: jest.fn().mockReturnValue(null),
  getFromMemory: jest.fn().mockReturnValue(null),
  setInMemory: jest.fn(),
  invalidateByPrefix: jest.fn(),
}));

const mockEmbeddingsCreate = jest.fn().mockResolvedValue({
  data: [{ embedding: new Array(1536).fill(0.1) }],
});
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: { create: mockEmbeddingsCreate },
  })),
}));

const retrievalService = require('../../src/services/retrievalService');

describe('retrievalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.1) }],
    });
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

  describe('retrieve (union / dedup / cap / order)', () => {
    const database = require('../../src/database');

    // Orthonormal axes: cosine is 1 on the same axis, 0 across axes.
    function vec(axis, dims = 8) {
      const v = new Array(dims).fill(0);
      v[axis] = 1;
      return v;
    }

    // Vector matching every stored axis with descending weights so each
    // stored embedding scores > 0 and the ranking order is deterministic.
    function queryVectorFor(ids) {
      const v = new Array(8).fill(0);
      ids.forEach((_, i) => {
        v[i] = 1 - i * 0.05;
      });
      return v;
    }

    function setupDb({ embeddings = [], hybridIds = [], vista = [] }) {
      database.query.mockImplementation(async (sql) => {
        if (/FROM medicina_embeddings/i.test(sql)) return [embeddings];
        if (/FROM dolencias d/i.test(sql)) return [hybridIds.map((id) => ({ idpoha: id }))];
        if (/FROM vw_medicina_entrenamiento/i.test(sql)) return [vista];
        return [[]];
      });
    }

    it('should_cap_at_8_and_dedup_when_vector_and_hybrid_overlap', async () => {
      // 6 vector hits (ids 1..6) + hybrid [6, 20, 30]: 6 overlaps.
      const ids = [1, 2, 3, 4, 5, 6];
      const embeddings = ids.map((id, i) => ({
        idpoha: id,
        embedding: JSON.stringify(vec(i)),
        resumen: `r${id}`,
      }));
      setupDb({
        embeddings,
        hybridIds: [6, 20, 30],
        vista: [...ids, 20, 30].map((id) => ({
          idpoha: id,
          texto_entrenamiento: `texto ${id}`,
          plantas_detalle_json: null,
        })),
      });
      mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: queryVectorFor(ids) }] });

      const result = await retrievalService.retrieve('pregunta con muchos candidatos');

      expect(result.ids).toHaveLength(8);
      expect(new Set(result.ids).size).toBe(8);
      // Vector hits first, ordered by score desc; hybrid-only hits at the end.
      expect(result.ids).toEqual([1, 2, 3, 4, 5, 6, 20, 30]);
      expect(result.degraded).toBe(false);
    });

    it('should_include_exact_match_when_dolencia_named_literally', async () => {
      // Poha 42 misses the vector ranking but matches the dolencia literally.
      setupDb({
        embeddings: [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'r3' }],
        hybridIds: [42],
        vista: [
          { idpoha: 3, texto_entrenamiento: 'texto 3', plantas_detalle_json: null },
          { idpoha: 42, texto_entrenamiento: 'texto 42', plantas_detalle_json: null },
        ],
      });
      mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });

      const result = await retrievalService.retrieve('algo para la gripe');

      expect(result.ids).toEqual([3, 42]);
      expect(result.contexto).toContain('[#3]');
      expect(result.contexto).toContain('[#42]');
    });

    it('should_rescue_compound_migraine_dolencia_by_question_token', async () => {
      const dolenciaDescripcion = 'Migraña dolor de cabeza';
      let hybridSql;
      let hybridOptions;
      database.query.mockImplementation(async (sql, options) => {
        if (/FROM medicina_embeddings/i.test(sql)) return [[]];
        if (/FROM dolencias d/i.test(sql)) {
          hybridSql = sql;
          hybridOptions = options;
          const tokens = Object.values(options.replacements);
          const matches = tokens.some((token) =>
            new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`, 'i').test(
              retrievalService.normalize(dolenciaDescripcion)
            )
          );
          return matches
            ? [[{ idpoha: 22 }]]
            : [[]];
        }
        if (/FROM vw_medicina_entrenamiento/i.test(sql)) {
          return [[
            {
              idpoha: 22,
              texto_entrenamiento: 'Anis para la migrana.',
              plantas_detalle_json: JSON.stringify([{ nombre: 'Anis' }]),
            },
          ]];
        }
        return [[]];
      });
      mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });

      const result = await retrievalService.retrieve('algo para la migraña');

      expect(result.ids).toEqual([22]);
      expect(result.contexto).toContain('[#22] Anis');
      expect(hybridSql).toMatch(/REGEXP/);
      // Patrón tolerante a acentos: REGEXP no usa collation, así que 'migrana'
      // (pregunta normalizada) debe poder matchear 'Migraña' (DB con acentos).
      expect(hybridOptions.replacements.dolenciaToken0).toBe(
        'm[iíìïî]gr[aáàäâã][nñ][aáàäâã]'
      );
      expect(new RegExp(hybridOptions.replacements.dolenciaToken0).test('migraña')).toBe(true);
      expect(hybridOptions.replacements).not.toHaveProperty('pregunta');
    });

    it('should_match_tos_as_a_word_without_matching_tostado', async () => {
      const dolencias = [
        { idpoha: 30, descripcion: 'Tostado' },
        { idpoha: 31, descripcion: 'Tos' },
      ];
      let hybridSql;
      database.query.mockImplementation(async (sql, options) => {
        if (/FROM medicina_embeddings/i.test(sql)) return [[]];
        if (/FROM dolencias d/i.test(sql)) {
          hybridSql = sql;
          const tokens = Object.values(options.replacements);
          const matching = dolencias.filter((dolencia) =>
            tokens.some((token) =>
              new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`, 'i').test(dolencia.descripcion)
            )
          );
          return [matching.map(({ idpoha }) => ({ idpoha }))];
        }
        if (/FROM vw_medicina_entrenamiento/i.test(sql)) {
          return [[
            {
              idpoha: 31,
              texto_entrenamiento: 'Tos.',
              plantas_detalle_json: JSON.stringify([{ nombre: 'Antitusivo' }]),
            },
          ]];
        }
        return [[]];
      });
      mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });

      const result = await retrievalService.retrieve('algo para la tos');

      expect(result.ids).toEqual([31]);
      expect(result.ids).not.toContain(30);
      expect(hybridSql).toContain('[^[:alnum:]]');
    });

    it('should_union_clauses_when_question_is_multi_dolencia', async () => {
      // One embedding call per clause; each clause matches a different poha.
      setupDb({
        embeddings: [
          { idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'r3' },
          { idpoha: 7, embedding: JSON.stringify(vec(1)), resumen: 'r7' },
        ],
        vista: [
          { idpoha: 3, texto_entrenamiento: 'texto 3', plantas_detalle_json: null },
          { idpoha: 7, texto_entrenamiento: 'texto 7', plantas_detalle_json: null },
        ],
      });
      mockEmbeddingsCreate
        .mockResolvedValueOnce({ data: [{ embedding: vec(0) }] })
        .mockResolvedValueOnce({ data: [{ embedding: vec(1) }] });

      const result = await retrievalService.retrieve('dolor de cabeza y dolor de garganta');

      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(2);
      expect(result.ids).toEqual(expect.arrayContaining([3, 7]));
      expect(result.similarityTop1).toBeCloseTo(1, 5);
    });

    it('should_retry_with_history_when_similarity_low', async () => {
      setupDb({
        embeddings: [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'r3' }],
        vista: [{ idpoha: 3, texto_entrenamiento: 'texto 3', plantas_detalle_json: null }],
      });
      // Standalone question scores 0; the history-aware re-embed scores 1.
      mockEmbeddingsCreate
        .mockResolvedValueOnce({ data: [{ embedding: vec(1) }] })
        .mockResolvedValueOnce({ data: [{ embedding: vec(0) }] });

      const result = await retrievalService.retrieve('otra planta para eso', {
        lastUserQuestion: 'que sirve para el dolor de cabeza',
      });

      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(2);
      expect(result.ids).toEqual([3]);
      expect(result.similarityTop1).toBeCloseTo(1, 5);
    });

    it('should_not_retry_when_no_recent_history', async () => {
      setupDb({
        embeddings: [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'r3' }],
      });
      mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(1) }] });

      const result = await retrievalService.retrieve('pregunta sin match');

      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
      expect(result.ids).toEqual([]);
      expect(result.contexto).toBeNull();
      expect(result.degraded).toBe(false);
    });

    it('should_degrade_to_hybrid_when_openai_fails', async () => {
      setupDb({
        embeddings: [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'r3' }],
        hybridIds: [5],
        vista: [{ idpoha: 5, texto_entrenamiento: 'texto 5', plantas_detalle_json: null }],
      });
      mockEmbeddingsCreate.mockRejectedValue(new Error('OpenAI 500'));

      const result = await retrievalService.retrieve('algo para la tos');

      expect(result).toMatchObject({ ids: [5], similarityTop1: 0, degraded: true });
      expect(result.contexto).toContain('[#5]');
    });
  });
});
