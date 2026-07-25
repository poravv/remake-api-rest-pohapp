/**
 * Retrieval for the RAG pipeline (AI_CONTEXT_MODE=rag).
 *
 * Owns everything between the sanitized user question and the top-k context
 * handed to the generator:
 *  - query embeddings via OpenAI text-embedding-3-small (Redis `embed:{sha256}`
 *    cache, see embeddingCache.js)
 *  - cosine ranking over the medicina_embeddings vectors, held in memory with
 *    a TTL so the ~344 JSON vectors are not re-parsed on every request
 *  - hybrid exact-match by dolencia, both as complement to the vector ranking
 *    and as sole source when OpenAI is down (degraded mode)
 *  - history-aware re-embed for follow-ups ("¿otra planta para eso?")
 *
 * retrieve() never throws on OpenAI failure: it degrades to hybrid-only and
 * flags it via `degraded` so the caller can decide (SERVICE_UNAVAILABLE vs
 * continue). DB errors DO propagate — they are handled at the route boundary.
 */

const { OpenAI } = require('openai');
const sequelize = require('../database');
const aiGuardrails = require('./aiGuardrails');
const embeddingCache = require('./embeddingCache');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = 'text-embedding-3-small';
const VECTOR_TOP_K = 6;
const HYBRID_MAX = 3;
const UNION_CAP = 8;
const MULTI_CLAUSE_TOP_K = 3;
const SIMILARITY_THRESHOLD = aiGuardrails.SIMILARITY_THRESHOLD;
const VECTORS_TTL_MS =
  parseInt(process.env.AI_VECTORS_TTL_SECONDS || '300', 10) * 1000;
const HYBRID_STOPWORDS = new Set([
  'algo',
  'algun',
  'alguna',
  'algunas',
  'algunos',
  'como',
  'con',
  'cual',
  'cuales',
  'donde',
  'duele',
  'ellas',
  'ellos',
  'esta',
  'estas',
  'este',
  'estos',
  'hay',
  'para',
  'por',
  'que',
  'sirve',
  'sobre',
  'tengo',
  'tiene',
  'tienen',
  'una',
  'unas',
  'uno',
  'unos',
]);

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

/**
 * In-memory vector cache. Loaded lazily, refreshed by TTL; each pod converges
 * within AI_VECTORS_TTL_SECONDS after a regen. embeddingRegenService calls
 * invalidateVectorCache() to refresh the local pod immediately.
 * Vectors are parsed once at load time, not per request.
 */
let vectorCache = { rows: null, loadedAt: 0 };

async function getVectorRows() {
  if (vectorCache.rows && Date.now() - vectorCache.loadedAt < VECTORS_TTL_MS) {
    return vectorCache.rows;
  }
  const [filas] = await sequelize.query(
    'SELECT idpoha, embedding, resumen FROM medicina_embeddings'
  );
  const rows = [];
  for (const fila of filas) {
    try {
      const vector =
        typeof fila.embedding === 'string' ? JSON.parse(fila.embedding) : fila.embedding;
      if (!Array.isArray(vector) || vector.length === 0) continue;
      rows.push({ idpoha: fila.idpoha, embedding: vector, resumen: fila.resumen });
    } catch (error) {
      console.warn(`Embedding invalido para idpoha ${fila.idpoha}:`, error.message);
    }
  }
  vectorCache = { rows, loadedAt: Date.now() };
  return rows;
}

function invalidateVectorCache() {
  vectorCache = { rows: null, loadedAt: 0 };
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
 * Split a natural-language question into sub-queries when the user asks
 * about multiple ailments in one turn ("dolor de cabeza y dolor de garganta").
 * Returns the original question as a singleton array when no connector is
 * detected or when any individual sub-query is trivially short.
 */
function splitMultiClauseQuery(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return [trimmed];
  const parts = trimmed
    .split(/\s*(?:\by\b|\be\b|\by también\b|,|;)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);
  // Only treat as multi-clause when at least two meaningful sub-queries
  // survive AND they are different — otherwise retrieval stays single.
  const unique = Array.from(new Set(parts.map((s) => s.toLowerCase())));
  if (unique.length < 2) return [trimmed];
  return parts;
}

/**
 * Vector retrieval for a possibly multi-clause question. Each clause is
 * embedded separately; candidates are unioned keeping the best score per
 * idpoha. Ranked with threshold 0 so `similarityTop1` reflects the real best
 * score even when it falls below AI_SIMILARITY_MIN (the caller needs it to
 * decide the history-aware retry).
 */
async function rankVectorCandidates(normalizedQuestion, filas) {
  const clauses = splitMultiClauseQuery(normalizedQuestion);
  if (clauses.length === 1) {
    const top = rankBySimilarity(filas, await generateEmbedding(clauses[0]), 0, VECTOR_TOP_K);
    return { top, similarityTop1: top.length > 0 ? top[0].score : 0 };
  }
  const byId = new Map();
  let similarityTop1 = 0;
  for (const clause of clauses) {
    const vector = await generateEmbedding(clause);
    const chunk = rankBySimilarity(filas, vector, 0, MULTI_CLAUSE_TOP_K);
    if (chunk.length > 0 && chunk[0].score > similarityTop1) {
      similarityTop1 = chunk[0].score;
    }
    for (const row of chunk) {
      const prev = byId.get(row.idpoha);
      if (!prev || row.score > prev.score) byId.set(row.idpoha, row);
    }
  }
  const merged = [...byId.values()].sort((a, b) => b.score - a.score);
  return { top: merged, similarityTop1 };
}

// REGEXP en MySQL no usa la collation (a diferencia de LIKE): 'n' no matchea
// 'ñ' ni 'a' matchea 'á'. La pregunta llega des-acentuada por normalize(),
// pero d.descripcion conserva acentos — cada letra se expande a su clase.
const ACCENT_CLASSES = {
  a: '[aáàäâã]',
  e: '[eéèëê]',
  i: '[iíìïî]',
  o: '[oóòöôõ]',
  u: '[uúùüû]',
  n: '[nñ]',
  c: '[cç]',
};

function accentTolerantPattern(token) {
  return token
    .split('')
    .map((ch) => ACCENT_CLASSES[ch] || ch)
    .join('');
}

/** Hybrid complement: match meaningful question words in registered dolencias. */
async function findHybridByDolencia(normalizedQuestion) {
  if (!normalizedQuestion) return [];

  const tokens = Array.from(
    new Set(
      normalizedQuestion
        .split(/[^a-z0-9]+/i)
        .filter((token) => token.length >= 3 && !HYBRID_STOPWORDS.has(token))
    )
  );
  if (tokens.length === 0) return [];

  const tokenConditions = tokens
    .map(
      (_, index) =>
        `LOWER(d.descripcion) REGEXP CONCAT('(^|[^[:alnum:]])', :dolenciaToken${index}, '([^[:alnum:]]|$)')`
    )
    .join(' OR ');
  const replacements = Object.fromEntries(
    tokens.map((token, index) => [`dolenciaToken${index}`, accentTolerantPattern(token)])
  );

  const [rows] = await sequelize.query(
    `SELECT DISTINCT dp.idpoha
       FROM dolencias d
       JOIN dolencias_poha dp ON dp.iddolencias = d.iddolencias
       JOIN poha p ON p.idpoha = dp.idpoha AND p.idusuario = dp.idusuario AND p.estado = 'AC'
      WHERE (${tokenConditions})
      LIMIT ${HYBRID_MAX}`,
    { replacements }
  );
  return rows.map((r) => r.idpoha);
}

/** Union dedup by idpoha: vector hits first (already score-desc), cap UNION_CAP. */
function unionCandidates(vectorTop, hybridIds) {
  const ids = [];
  const seen = new Set();
  for (const candidate of vectorTop) {
    if (seen.has(candidate.idpoha)) continue;
    seen.add(candidate.idpoha);
    ids.push(candidate.idpoha);
  }
  for (const idpoha of hybridIds) {
    if (seen.has(idpoha)) continue;
    seen.add(idpoha);
    ids.push(idpoha);
  }
  return ids.slice(0, UNION_CAP);
}

/**
 * Build the context block the generator can cite from. The `[#<id>]` prefix
 * is the ONLY way the model learns which idpoha maps to which remedy — it has
 * to be here, otherwise idpoha_refs comes back empty and the guardrail
 * rejects the response as NO_REFS.
 */
function buildContexto(plantas) {
  return plantas
    .map((p) => {
      let nombre = 'Planta sin nombre';
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
      return `[#${p.idpoha}] ${nombre}:\n${p.texto_entrenamiento}`;
    })
    .join('\n\n');
}

async function loadContexto(ids) {
  if (ids.length === 0) return null;
  const [plantas] = await sequelize.query(
    `SELECT idpoha, texto_entrenamiento, plantas_detalle_json
       FROM vw_medicina_entrenamiento
      WHERE idpoha IN (${ids.map(() => '?').join(',')})`,
    { replacements: ids }
  );
  const byId = new Map(plantas.map((p) => [p.idpoha, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  return ordered.length > 0 ? buildContexto(ordered) : null;
}

/**
 * Retrieve top-k pohas for the question. Never throws on OpenAI failure:
 * degrades to hybrid-only and flags it in `degraded`.
 *
 * @param {string} preguntaSafe already-sanitized question
 * @param {{lastUserQuestion?: string}} [opts] last question from chat_historial
 *   (15-min window) — enables ONE history-aware re-embed retry when the
 *   question alone scores below AI_SIMILARITY_MIN
 * @returns {Promise<{
 *   ids: number[],           // unique idpoha, cap 8, vector hits first by score desc
 *   contexto: string|null,   // "[#id] nombre:\n{texto_entrenamiento}" chunks, null if ids=[]
 *   similarityTop1: number,  // 0 if degraded or no vector candidates
 *   degraded: boolean        // true if OpenAI embeddings failed
 * }>}
 */
async function retrieve(preguntaSafe, opts = {}) {
  const normalizedQuestion = normalize(preguntaSafe);
  const rows = await getVectorRows();

  let vectorTop = [];
  let similarityTop1 = 0;
  let degraded = false;
  try {
    let ranking = await rankVectorCandidates(normalizedQuestion, rows);
    if (ranking.similarityTop1 < SIMILARITY_THRESHOLD && opts.lastUserQuestion) {
      const combined = normalize(`${opts.lastUserQuestion} ${preguntaSafe}`);
      const retry = await rankVectorCandidates(combined, rows);
      if (retry.similarityTop1 > ranking.similarityTop1) ranking = retry;
    }
    similarityTop1 = ranking.similarityTop1;
    vectorTop = ranking.top
      .filter((r) => r.score >= SIMILARITY_THRESHOLD)
      .slice(0, VECTOR_TOP_K);
  } catch (error) {
    degraded = true;
    similarityTop1 = 0;
    console.warn('retrievalService: fallo OpenAI embeddings, modo hibrido-only:', error.message);
  }

  const hybridIds = await findHybridByDolencia(normalizedQuestion);
  const ids = unionCandidates(vectorTop, hybridIds);
  const contexto = await loadContexto(ids);

  return { ids, contexto, similarityTop1, degraded };
}

/**
 * Retrieval-only smoke test for POST /query-nlp/preview. Runs the SAME
 * parameters as the productive pipeline (top-6 vector >= AI_SIMILARITY_MIN +
 * hybrid, cap 8) so operators can validate retrieval before the rag cutover.
 * Hybrid-only hits carry score 0 (no vector score). Errors propagate to the
 * route (diagnostic endpoint — no degraded mode here).
 */
async function queryPreview(pregunta) {
  const cleanInput = normalize(pregunta);
  const rows = await getVectorRows();

  const ranking = await rankVectorCandidates(cleanInput, rows);
  const vectorTop = ranking.top
    .filter((r) => r.score >= SIMILARITY_THRESHOLD)
    .slice(0, VECTOR_TOP_K);

  const hybridIds = await findHybridByDolencia(cleanInput);
  const byId = new Map(rows.map((r) => [r.idpoha, r]));
  const seen = new Set(vectorTop.map((r) => r.idpoha));
  const resultados = vectorTop.map(({ idpoha, score, resumen }) => ({ idpoha, score, resumen }));
  for (const idpoha of hybridIds) {
    if (resultados.length >= UNION_CAP) break;
    if (seen.has(idpoha)) continue;
    seen.add(idpoha);
    resultados.push({ idpoha, score: 0, resumen: byId.get(idpoha)?.resumen || undefined });
  }

  return {
    pregunta: cleanInput,
    resultados,
    total: resultados.length,
    sugerencia:
      resultados.length === 0
        ? 'Ajusta el texto de busqueda o entrena mejor tus embeddings.'
        : undefined,
  };
}

module.exports = {
  retrieve,
  queryPreview,
  invalidateVectorCache,
  // reused by tests and other services
  normalize,
  cosineSimilarity,
  generateEmbedding,
};
