/**
 * Boundary tests for POST /query-nlp/explica with AI_CONTEXT_MODE=rag.
 *
 * Strategy: mock ONLY external dependencies (OpenAI embeddings, Anthropic,
 * Sequelize, Redis-backed caches). The real claudeNlpService, retrievalService
 * and aiGuardrails run end to end, so these tests exercise the actual
 * retrieval -> gates -> generation -> cross-check -> persistence pipeline.
 */

jest.mock('../../src/services/cacheClient', () => ({
  initRedis: jest.fn().mockResolvedValue(false),
  isRedisReady: jest.fn().mockReturnValue(false),
  hasRedisConfig: jest.fn().mockReturnValue(false),
  getRedisClient: jest.fn().mockReturnValue(null),
  getFromMemory: jest.fn().mockReturnValue(null),
  setInMemory: jest.fn(),
  invalidateByPrefix: jest.fn(),
}));

jest.mock('../../src/middleware/auth', () => ({
  verifyToken: (req, _res, next) => {
    req.user = { uid: 'user-uid-1' };
    next();
  },
  requireAdmin: (_req, _res, next) => next(),
  optionalAuth: (_req, _res, next) => next(),
}));

const mockEmbeddingsCreate = jest.fn();
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: { create: mockEmbeddingsCreate },
  })),
}));

const mockMessagesCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  }))
);

const mockDbQuery = jest.fn();
jest.mock('../../src/database', () => ({
  query: mockDbQuery,
}));

const request = require('supertest');
const express = require('express');
const retrievalService = require('../../src/services/retrievalService');
const { buildHistorySummary, isFollowUpQuestion } = require('../../src/services/claudeNlpService');

// Small orthonormal basis so cosine scores are exactly 1 (same axis) or 0.
function vec(axis) {
  const v = new Array(8).fill(0);
  v[axis] = 1;
  return v;
}

function anthropicToolResponse(input) {
  return {
    model: 'claude-haiku-4-5-20251001',
    usage: { input_tokens: 900, output_tokens: 120 },
    content: [{ type: 'tool_use', name: 'responder_consulta', input }],
  };
}

// Programmable fake DB: each query is dispatched by table name.
let db;

function resetDb() {
  db = {
    historial: [],
    embeddings: [],
    hybridIds: [],
    vista: [],
    pohasAC: [],
    plantas: [],
    inserts: [],
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  // eslint-disable-next-line global-require
  app.use('/api/pohapp/query-nlp/explica', require('../../src/routes/queryNLPExplica'));
  return app;
}

describe('POST /api/pohapp/query-nlp/explica (AI_CONTEXT_MODE=rag)', () => {
  let app;
  const originalMode = process.env.AI_CONTEXT_MODE;
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

  beforeAll(() => {
    process.env.AI_CONTEXT_MODE = 'rag';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    app = buildApp();
  });

  afterAll(() => {
    process.env.AI_CONTEXT_MODE = originalMode;
    process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    retrievalService.invalidateVectorCache();
    resetDb();
    mockDbQuery.mockImplementation(async (sql, opts) => {
      if (/INSERT INTO chat_historial/i.test(sql)) {
        db.inserts.push(opts.replacements);
        return [[]];
      }
      if (/FROM chat_historial/i.test(sql)) return [db.historial];
      if (/FROM medicina_embeddings/i.test(sql)) return [db.embeddings];
      if (/FROM dolencias d/i.test(sql)) return [db.hybridIds.map((id) => ({ idpoha: id }))];
      if (/FROM vw_medicina_entrenamiento/i.test(sql)) return [db.vista];
      if (/FROM poha WHERE/i.test(sql)) return [db.pohasAC.map((id) => ({ idpoha: id }))];
      if (/FROM planta pl/i.test(sql)) return [db.plantas];
      return [[]];
    });
  });

  function ask(pregunta) {
    return request(app)
      .post('/api/pohapp/query-nlp/explica')
      .set('Content-Type', 'application/json')
      .send({ pregunta, idusuario: 'user-uid-1' });
  }

  it('should_build_a_bounded_local_summary_only_for_follow_ups', () => {
    expect(isFollowUpQuestion('¿Y otra planta para eso?')).toBe(true);
    expect(isFollowUpQuestion('¿Qué sirve para la gripe?')).toBe(false);

    const summary = buildHistorySummary('¿Y otra planta para eso?', [
      { pregunta: 'consulta antigua', respuesta: 'respuesta antigua' },
      { pregunta: '¿Qué sirve para la tos?', respuesta: 'La planta A puede ayudar.' },
      { pregunta: '¿Cómo se prepara?', respuesta: 'Se prepara en infusión.' },
    ]);

    expect(summary).toContain('¿Qué sirve para la tos?');
    expect(summary).toContain('¿Cómo se prepara?');
    expect(summary).not.toContain('consulta antigua');
    expect(summary.length).toBeLessThanOrEqual(2400);
    expect(buildHistorySummary('¿Qué sirve para la gripe?', [])).toBe('');
  });

  it('should_send_only_the_compact_summary_for_a_follow_up', async () => {
    db.historial = [
      { pregunta: 'consulta antigua', respuesta: 'respuesta antigua' },
      { pregunta: '¿Qué sirve para la tos?', respuesta: 'La planta A puede ayudar.' },
      { pregunta: '¿Cómo se prepara?', respuesta: 'Se prepara en infusión.' },
    ];
    db.embeddings = [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'Menta' }];
    db.vista = [
      {
        idpoha: 3,
        texto_entrenamiento: 'La menta se usa para la digestion.',
        plantas_detalle_json: JSON.stringify([{ nombre: 'Menta' }]),
      },
    ];
    db.pohasAC = [3];
    db.plantas = [{ nombre: 'Menta', nombre_cientifico: 'Mentha', imagen: 'menta.jpg' }];
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });
    mockMessagesCreate.mockResolvedValue(
      anthropicToolResponse({
        respuesta: 'La menta puede ayudar.',
        idpoha_refs: [3],
        confianza: 0.9,
        off_topic: false,
      })
    );

    const res = await ask('¿Y otra planta para eso?');

    expect(res.status).toBe(200);
    const call = mockMessagesCreate.mock.calls[0][0];
    expect(call.messages).toHaveLength(1);
    expect(call.messages[0].content).toContain('Resumen breve de la conversación previa');
    expect(call.messages[0].content).toContain('¿Qué sirve para la tos?');
    expect(call.messages[0].content).not.toContain('consulta antigua');
  });

  it('should_answer_with_rag_context_when_similarity_passes', async () => {
    db.embeddings = [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'Menta' }];
    db.vista = [
      {
        idpoha: 3,
        texto_entrenamiento: 'La menta se usa para la digestion.',
        plantas_detalle_json: JSON.stringify([{ nombre: 'Menta' }]),
      },
    ];
    db.pohasAC = [3];
    db.plantas = [{ nombre: 'Menta', nombre_cientifico: 'Mentha', imagen: 'menta.jpg' }];
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });
    mockMessagesCreate.mockResolvedValue(
      anthropicToolResponse({
        respuesta: 'La menta ayuda a la digestion.',
        idpoha_refs: [3],
        confianza: 0.9,
        off_topic: false,
      })
    );

    const res = await ask('que sirve para la digestion');

    expect(res.status).toBe(200);
    expect(res.body.ids).toEqual([3]);
    expect(res.body.fuera_de_dominio).toBe(false);
    // Images come from the DB, never from the model output (design D4).
    expect(res.body.imagenes).toEqual([
      { nombre: 'Menta', nombre_cientifico: 'Mentha', imagen: 'menta.jpg' },
    ]);
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].idusuario).toBe('user-uid-1');

    // RAG model input: static rules system (string, no catalog), retrieved
    // context in the user turn, tool without imagenes_refs.
    const call = mockMessagesCreate.mock.calls[0][0];
    expect(typeof call.system).toBe('string');
    expect(call.system).not.toMatch(/## Catalogo/i);
    const lastMessage = call.messages[call.messages.length - 1];
    expect(lastMessage.content).toContain('Contexto de pohã disponible');
    expect(lastMessage.content).toContain('[#3]');
    expect(call.tools[0].input_schema.properties.imagenes_refs).toBeUndefined();
  });

  it('should_reject_low_similarity_when_query_is_off_domain', async () => {
    db.embeddings = [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'Menta' }];
    // Orthogonal query vector -> score 0 < 0.35; no hybrid hits.
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(1) }] });

    const res = await ask('como programo en python');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ids: [],
      explicacion: 'No tengo informacion suficiente en la base de conocimiento.',
      imagenes: [],
      fuera_de_dominio: false,
      reason: 'LOW_SIMILARITY',
    });
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(db.inserts).toHaveLength(0);
  });

  it('should_return_service_unavailable_when_no_fallback_candidates', async () => {
    db.embeddings = [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'Menta' }];
    mockEmbeddingsCreate.mockRejectedValue(new Error('OpenAI 500'));

    const res = await ask('que sirve para el insomnio');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ids: [],
      imagenes: [],
      fuera_de_dominio: false,
      reason: 'SERVICE_UNAVAILABLE',
    });
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(db.inserts).toHaveLength(0);
  });

  it('should_degrade_to_hybrid_when_openai_fails', async () => {
    mockEmbeddingsCreate.mockRejectedValue(new Error('OpenAI 500'));
    db.hybridIds = [42];
    db.vista = [
      {
        idpoha: 42,
        texto_entrenamiento: 'El jengibre alivia la gripe.',
        plantas_detalle_json: JSON.stringify([{ nombre: 'Jengibre' }]),
      },
    ];
    db.pohasAC = [42];
    db.plantas = [{ nombre: 'Jengibre', nombre_cientifico: 'Zingiber', imagen: 'jengibre.jpg' }];
    mockMessagesCreate.mockResolvedValue(
      anthropicToolResponse({
        respuesta: 'El jengibre alivia la gripe.',
        idpoha_refs: [42],
        confianza: 0.85,
        off_topic: false,
      })
    );

    const res = await ask('algo para la gripe');

    expect(res.status).toBe(200);
    expect(res.body.ids).toEqual([42]);
    expect(res.body.reason).toBeUndefined();
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    expect(db.inserts).toHaveLength(1);
  });

  it('should_return_off_domain_when_model_flags_off_topic', async () => {
    db.embeddings = [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'Menta' }];
    db.vista = [
      {
        idpoha: 3,
        texto_entrenamiento: 'La menta se usa para la digestion.',
        plantas_detalle_json: JSON.stringify([{ nombre: 'Menta' }]),
      },
    ];
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });
    mockMessagesCreate.mockResolvedValue(
      anthropicToolResponse({
        respuesta: 'No corresponde.',
        idpoha_refs: [],
        confianza: 0.4,
        off_topic: true,
      })
    );

    const res = await ask('quien gano el mundial');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ids: [],
      explicacion: 'Solo puedo responder sobre plantas medicinales paraguayas.',
      fuera_de_dominio: true,
      reason: 'FUERA_DE_DOMINIO',
    });
    expect(db.inserts).toHaveLength(0);
  });

  it('should_drop_ref_when_not_in_retrieved_subset', async () => {
    db.embeddings = [{ idpoha: 3, embedding: JSON.stringify(vec(0)), resumen: 'Menta' }];
    db.vista = [
      {
        idpoha: 3,
        texto_entrenamiento: 'La menta se usa para la digestion.',
        plantas_detalle_json: JSON.stringify([{ nombre: 'Menta' }]),
      },
    ];
    db.pohasAC = [3, 120];
    db.plantas = [{ nombre: 'Menta', nombre_cientifico: 'Mentha', imagen: 'menta.jpg' }];
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });
    // The model hallucinates ref 120, which exists in the DB but was NOT retrieved.
    mockMessagesCreate.mockResolvedValue(
      anthropicToolResponse({
        respuesta: 'La menta ayuda a la digestion.',
        idpoha_refs: [3, 120],
        confianza: 0.9,
        off_topic: false,
      })
    );

    const res = await ask('que sirve para la digestion');

    expect(res.status).toBe(200);
    expect(res.body.ids).toEqual([3]);
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].idpoha_json).toBe(JSON.stringify([3]));
  });

  it('should_return_empty_images_when_planta_has_no_img', async () => {
    db.embeddings = [{ idpoha: 15, embedding: JSON.stringify(vec(0)), resumen: 'Ruda' }];
    db.vista = [
      {
        idpoha: 15,
        texto_entrenamiento: 'La ruda se usa en te.',
        plantas_detalle_json: JSON.stringify([{ nombre: 'Ruda' }]),
      },
    ];
    db.pohasAC = [15];
    db.plantas = []; // planta.img NULL/'' rows are filtered out by the SQL
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: vec(0) }] });
    mockMessagesCreate.mockResolvedValue(
      anthropicToolResponse({
        respuesta: 'La ruda se toma en te.',
        idpoha_refs: [15],
        confianza: 0.9,
        off_topic: false,
      })
    );

    const res = await ask('para que sirve la ruda');

    expect(res.status).toBe(200);
    expect(res.body.ids).toEqual([15]);
    expect(res.body.imagenes).toEqual([]);
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].imagenes_json).toBe('[]');
  });
});
