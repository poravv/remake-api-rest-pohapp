/**
 * Orchestrator for the /query-nlp/explica pipeline.
 *
 * Responsibilities:
 *  - Sanitize user input (defense in depth — middleware already did it).
 *  - Retrieve candidate pohas via embedding similarity (cached in Redis).
 *  - Call GPT-4o with a reinforced, domain-locked system prompt and a strict
 *    json_schema response_format.
 *  - Cross-check idpoha refs and image URLs against the DB.
 *  - Gate persistence through aiGuardrails.shouldPersist.
 *
 * This module is the last stop before INSERT. No OpenAI traffic ever leaves
 * the backend through any other path.
 */

const { OpenAI } = require('openai');
const sequelize = require('../database');
const aiGuardrails = require('./aiGuardrails');
const embeddingCache = require('./embeddingCache');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o';
const CANDIDATE_TOP_N = 5;
const HISTORY_WINDOW_MINUTES = 15;
const OFF_DOMAIN_FALLBACK = 'Solo puedo responder sobre plantas medicinales paraguayas.';
const NO_CONTEXT_FALLBACK = 'No tengo informacion suficiente en la base de conocimiento.';

/**
 * Rejection-reason counters (in-memory). Exposed via getMetrics() so a future
 * metrics endpoint can scrape them; also emitted as structured log lines.
 */
const metricsCounters = {
  LOW_CONFIDENCE: 0,
  FUERA_DE_DOMINIO: 0,
  LOW_SIMILARITY: 0,
  NO_REFS: 0,
  SCHEMA_FAIL: 0,
  INJECTION_DETECTED: 0,
  OK: 0,
};

function logGuardrail(decision, extra) {
  const payload = { event: 'guardrail_decision', reason: decision.reason, ...extra };
  try {
    console.log(JSON.stringify(payload));
  } catch (_err) {
    // Logging must never throw upstream.
  }
}

function normalize(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s,.()\u00C0-\u017F]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cosineSimilarity(vec1, vec2) {
  if (!Array.isArray(vec1) || !Array.isArray(vec2) || vec1.length !== vec2.length) return 0;
  const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
  if (mag1 === 0 || mag2 === 0) return 0;
  return dot / (mag1 * mag2);
}

/**
 * Compute (or reuse) an embedding for `text`. The cache is keyed by the
 * content hash so identical inputs across users share a cache slot.
 */
async function generateEmbedding(text) {
  const normalizedText = embeddingCache.normalizeForHash(text);
  const hash = embeddingCache.hashOf(normalizedText);

  const cached = await embeddingCache.get(hash);
  if (cached && Array.isArray(cached)) {
    console.log(JSON.stringify({ event: 'ai.embedding.cache.hit' }));
    return cached;
  }
  console.log(JSON.stringify({ event: 'ai.embedding.cache.miss' }));

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: normalizedText || text,
  });
  const vector = response.data[0].embedding;

  await embeddingCache.set(hash, vector);
  return vector;
}

async function getStoredEmbeddings() {
  const [filas] = await sequelize.query('SELECT idpoha, embedding FROM medicina_embeddings');
  return filas;
}

async function getStoredEmbeddingsWithResumen() {
  const [filas] = await sequelize.query(
    'SELECT idpoha, embedding, resumen FROM medicina_embeddings'
  );
  return filas;
}

function rankBySimilarity(filas, inputVector, threshold, topN) {
  const resultados = [];

  for (const fila of filas) {
    try {
      const vector =
        typeof fila.embedding === 'string' ? JSON.parse(fila.embedding) : fila.embedding;
      if (!Array.isArray(vector) || vector.length === 0) continue;
      const score = cosineSimilarity(vector, inputVector);
      resultados.push({ idpoha: fila.idpoha, score, resumen: fila.resumen || undefined });
    } catch (error) {
      console.warn(`Embedding invalido para idpoha ${fila.idpoha}:`, error.message);
    }
  }

  resultados.sort((a, b) => b.score - a.score);
  return resultados.filter((r) => r.score >= threshold).slice(0, topN);
}

/**
 * Cross-check idpoha refs against the poha table (estado='AC').
 * Returns `{kept, dropped}` — only kept ids proceed to persistence.
 */
async function crossCheckIdpoha(refs) {
  if (!Array.isArray(refs) || refs.length === 0) return { kept: [], dropped: [] };
  const [rows] = await sequelize.query(
    `SELECT idpoha FROM poha WHERE idpoha IN (${refs.map(() => '?').join(',')}) AND estado = 'AC'`,
    { replacements: refs }
  );
  const existing = new Set(rows.map((r) => r.idpoha));
  const kept = refs.filter((r) => existing.has(r));
  const dropped = refs.filter((r) => !existing.has(r));
  return { kept, dropped };
}

/**
 * Match image URLs against the canonical `planta.img` column for the given
 * idpoha ids (via poha_planta). Non-canonical URLs are dropped. Pure-shape
 * validation has already happened in aiGuardrails.validateImages.
 */
async function crossCheckImages(imgs, keptIdpoha) {
  if (!Array.isArray(imgs) || imgs.length === 0 || keptIdpoha.length === 0) {
    return { kept: [], dropped: imgs || [] };
  }
  const urls = imgs.map((i) => i.url);
  const [rows] = await sequelize.query(
    `SELECT DISTINCT pl.img AS img
       FROM planta pl
       JOIN poha_planta pp ON pp.idplanta = pl.idplanta
      WHERE pp.idpoha IN (${keptIdpoha.map(() => '?').join(',')})
        AND pl.img IN (${urls.map(() => '?').join(',')})`,
    { replacements: [...keptIdpoha, ...urls] }
  );
  const canonical = new Set(rows.map((r) => r.img));
  const kept = imgs.filter((i) => canonical.has(i.url));
  const dropped = imgs.filter((i) => !canonical.has(i.url));
  return { kept, dropped };
}

/**
 * Build the user-turn payload that carries the retrieval context alongside
 * the sanitized user question. Context is a compact bullet list the model
 * can cite from; the model is instructed NOT to invent anything outside it.
 */
function buildContextoActual(plantas) {
  return plantas
    .map((p) => {
      let nombre = `Planta ${p.idpoha}`;
      try {
        const detalle =
          typeof p.plantas_detalle_json === 'string'
            ? JSON.parse(p.plantas_detalle_json)
            : p.plantas_detalle_json;
        if (Array.isArray(detalle) && detalle.length > 0) {
          nombre = detalle.map((pl) => pl.nombre).filter(Boolean).join(', ') || nombre;
        }
      } catch (_err) {
        // ignore — fall back to generic label
      }
      return `idpoha=${p.idpoha} (${nombre}):\n${p.texto_entrenamiento}`;
    })
    .join('\n\n');
}

/**
 * Call OpenAI with the strict json_schema response format. Up to 1 retry on
 * schema failure; second failure is surfaced as SCHEMA_FAIL for the caller
 * to treat as off-domain.
 */
async function callModelStrict(mensajesPrevios, userContent) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: aiGuardrails.buildSystemPrompt() },
        ...mensajesPrevios,
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: aiGuardrails.buildResponseSchema(),
      },
    });
    const raw = completion.choices[0]?.message?.content || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      parsed = null;
    }
    const check = aiGuardrails.parseSchema(parsed);
    if (check.ok) return { ok: true, payload: check.payload };
  }
  return { ok: false, reason: aiGuardrails.REASONS.SCHEMA_FAIL };
}

/**
 * Build the standard off-domain or no-context response body. This is what
 * the Flutter client receives when the guardrail gate rejects — never
 * written to chat_historial.
 */
function buildRejectionResponse(reason) {
  const isOffDomain =
    reason === aiGuardrails.REASONS.FUERA_DE_DOMINIO ||
    reason === aiGuardrails.REASONS.INJECTION_DETECTED ||
    reason === aiGuardrails.REASONS.SCHEMA_FAIL;
  return {
    ids: [],
    explicacion: isOffDomain ? OFF_DOMAIN_FALLBACK : NO_CONTEXT_FALLBACK,
    imagenes: [],
    fuera_de_dominio: isOffDomain,
    reason,
  };
}

/**
 * Main entry point used by POST /query-nlp/explica.
 * Orchestrates retrieval → LLM → guardrails → optional persistence.
 *
 * @param {string} pregunta Sanitized user question (middleware already capped).
 * @param {string|number} idusuario Firebase uid or legacy numeric id.
 * @param {{fueraDeDominio?: boolean}} [flags] Upstream signals (e.g. injection).
 * @returns {Promise<{ids:number[], explicacion:string, imagenes:object[], fuera_de_dominio?:boolean, reason?:string}>}
 */
async function queryWithExplanation(pregunta, idusuario, flags = {}) {
  // Defense in depth — middleware has already sanitized.
  const preguntaSafe = aiGuardrails.sanitizeInput(pregunta);

  if (flags.fueraDeDominio || aiGuardrails.hasInjectionMarker(preguntaSafe)) {
    const decision = { reason: aiGuardrails.REASONS.INJECTION_DETECTED };
    metricsCounters[decision.reason] += 1;
    logGuardrail(decision, { stage: 'pre-embed' });
    return buildRejectionResponse(decision.reason);
  }

  const normalizedQuestion = normalize(preguntaSafe);
  const inputVector = await generateEmbedding(normalizedQuestion);
  const filas = await getStoredEmbeddings();
  const top = rankBySimilarity(filas, inputVector, 0, CANDIDATE_TOP_N);
  const similarityTop1 = top.length > 0 ? top[0].score : 0;

  if (similarityTop1 < aiGuardrails.SIMILARITY_THRESHOLD) {
    const decision = { reason: aiGuardrails.REASONS.LOW_SIMILARITY };
    metricsCounters[decision.reason] += 1;
    logGuardrail(decision, { similarity_top1: similarityTop1, ref_count: 0 });
    return buildRejectionResponse(decision.reason);
  }

  const candidateIds = top.map((r) => r.idpoha);
  const [plantas] = await sequelize.query(
    `SELECT idpoha, texto_entrenamiento, plantas_detalle_json
       FROM vw_medicina_entrenamiento
      WHERE idpoha IN (${candidateIds.map(() => '?').join(',')})`,
    { replacements: candidateIds }
  );

  const contextoActual = buildContextoActual(plantas);

  const [historial] = await sequelize.query(
    `SELECT pregunta, respuesta FROM chat_historial
      WHERE idusuario = ? AND fecha >= NOW() - INTERVAL ${HISTORY_WINDOW_MINUTES} MINUTE
      ORDER BY fecha ASC`,
    { replacements: [idusuario] }
  );
  const mensajesPrevios = historial.flatMap((h) => [
    { role: 'user', content: h.pregunta },
    { role: 'assistant', content: h.respuesta },
  ]);

  const userContent = contextoActual
    ? `${preguntaSafe}\n\nContexto de pohã disponible (usa SOLO estos IDs y URLs):\n${contextoActual}`
    : preguntaSafe;

  const modelResult = await callModelStrict(mensajesPrevios, userContent);
  if (!modelResult.ok) {
    const decision = { reason: modelResult.reason };
    metricsCounters[decision.reason] += 1;
    logGuardrail(decision, { similarity_top1: similarityTop1 });
    return buildRejectionResponse(decision.reason);
  }

  const payload = modelResult.payload;

  if (payload.off_topic || payload.respuesta === 'FUERA_DE_DOMINIO') {
    const decision = { reason: aiGuardrails.REASONS.FUERA_DE_DOMINIO };
    metricsCounters[decision.reason] += 1;
    logGuardrail(decision, {
      similarity_top1: similarityTop1,
      confianza: payload.confianza,
    });
    return buildRejectionResponse(decision.reason);
  }

  // Pure-shape filter first, then DB cross-check.
  const refsShape = aiGuardrails.validateRefs(payload.idpoha_refs);
  const refsDb = await crossCheckIdpoha(refsShape.kept);
  const keptRefs = refsDb.kept;
  if (refsDb.dropped.length > 0) {
    console.log(
      JSON.stringify({
        event: 'ai.idpoha.dropped',
        count: refsDb.dropped.length,
        dropped: refsDb.dropped,
      })
    );
  }

  const imgsShape = aiGuardrails.validateImages(payload.imagenes_refs);
  const imgsDb = await crossCheckImages(imgsShape.valid, keptRefs);
  if (imgsDb.dropped.length > 0) {
    console.log(
      JSON.stringify({
        event: 'ai.image.dropped',
        count: imgsDb.dropped.length,
      })
    );
  }
  const keptImages = imgsDb.kept;

  const gate = aiGuardrails.shouldPersist({
    confianza: payload.confianza,
    off_topic: payload.off_topic,
    similarityTop1,
    keptRefsCount: keptRefs.length,
  });
  metricsCounters[gate.reason] = (metricsCounters[gate.reason] || 0) + 1;
  logGuardrail(gate, {
    similarity_top1: similarityTop1,
    confianza: payload.confianza,
    ref_count: keptRefs.length,
  });

  if (!gate.persist) {
    return buildRejectionResponse(gate.reason);
  }

  await sequelize.query(
    `INSERT INTO chat_historial (idusuario, pregunta, respuesta, idpoha_json, imagenes_json)
     VALUES (:idusuario, :pregunta, :respuesta, :idpoha_json, :imagenes_json)`,
    {
      replacements: {
        idusuario,
        pregunta: preguntaSafe,
        respuesta: payload.respuesta,
        idpoha_json: JSON.stringify(keptRefs),
        imagenes_json: JSON.stringify(keptImages),
      },
    }
  );

  return {
    ids: keptRefs,
    explicacion: payload.respuesta,
    imagenes: keptImages,
    confianza: payload.confianza,
    fuera_de_dominio: false,
  };
}

async function queryPreview(pregunta) {
  const cleanInput = normalize(pregunta);
  const inputVector = await generateEmbedding(cleanInput);
  const filas = await getStoredEmbeddingsWithResumen();
  const relevantes = rankBySimilarity(filas, inputVector, 0.55, 5);

  return {
    pregunta: cleanInput,
    resultados: relevantes,
    total: relevantes.length,
    sugerencia:
      relevantes.length === 0
        ? 'Ajusta el texto de busqueda o entrena mejor tus embeddings.'
        : undefined,
  };
}

async function getChatHistory(idusuario) {
  const [historial] = await sequelize.query(
    `SELECT id, pregunta, respuesta, fecha, idpoha_json, imagenes_json
       FROM chat_historial
      WHERE idusuario = :idusuario
      ORDER BY fecha DESC
      LIMIT 50`,
    { replacements: { idusuario } }
  );
  return { historial };
}

/** Snapshot of the in-memory rejection counters (for debugging / future metrics endpoint). */
function getMetrics() {
  return { ...metricsCounters };
}

module.exports = {
  normalize,
  cosineSimilarity,
  generateEmbedding,
  queryWithExplanation,
  queryPreview,
  getChatHistory,
  getMetrics,
};
