/**
 * Claude-based orchestrator for the /query-nlp/explica pipeline.
 *
 * Replaces nlpService.js (OpenAI + embeddings) with Claude Haiku via tool use
 * and prompt caching. The full poha catalog lives in the cached system prompt,
 * so no per-request embedding retrieval is needed.
 *
 * Responsibilities:
 *  - Sanitize and injection-check user input.
 *  - Load the catalog (Redis-cached) and inject it into Claude's system prompt.
 *  - Retrieve recent chat history for conversational continuity.
 *  - Call Claude with tool_choice=required so the response is always structured.
 *  - Cross-check idpoha refs and image URLs against the DB.
 *  - Gate persistence through aiGuardrails.shouldPersist.
 *  - Persist to chat_historial on gate pass.
 */

const Anthropic = require('@anthropic-ai/sdk');
const sequelize = require('../database');
const aiGuardrails = require('./aiGuardrails');
const catalogService = require('./catalogService');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HISTORY_WINDOW_MINUTES = 15;
const OFF_DOMAIN_FALLBACK = 'Solo puedo responder sobre plantas medicinales paraguayas.';
const NO_CONTEXT_FALLBACK = 'No tengo informacion suficiente en la base de conocimiento.';

const metricsCounters = {
  LOW_CONFIDENCE: 0,
  FUERA_DE_DOMINIO: 0,
  NO_REFS: 0,
  SCHEMA_FAIL: 0,
  INJECTION_DETECTED: 0,
  OK: 0,
};

function logGuardrail(decision, extra) {
  try {
    console.log(JSON.stringify({ event: 'guardrail_decision', reason: decision.reason, ...extra }));
  } catch (_err) {
    // Logging must never throw upstream.
  }
}

/**
 * Cross-check idpoha refs against poha table (estado='AC').
 * @param {number[]} refs
 * @returns {Promise<{kept:number[], dropped:number[]}>}
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
 * Match imagen values from Claude's response against the canonical `planta.img`
 * column for the given idpoha ids (via poha_planta).
 *
 * The view field is `imagen` (mapped from planta.img in the JSON_OBJECT), so
 * Claude returns objects with { nombre, nombre_cientifico, imagen }. We cross-
 * check the `imagen` value against `planta.img` in the DB.
 *
 * @param {Array<{nombre:string, nombre_cientifico:string, imagen:string}>} imgs
 * @param {number[]} keptIdpoha
 * @returns {Promise<{kept:Array, dropped:Array}>}
 */
async function crossCheckImages(imgs, keptIdpoha) {
  if (!Array.isArray(imgs) || imgs.length === 0 || keptIdpoha.length === 0) {
    return { kept: [], dropped: imgs || [] };
  }
  const imagenValues = imgs.map((i) => i.imagen).filter(Boolean);
  if (imagenValues.length === 0) return { kept: [], dropped: imgs };

  const [rows] = await sequelize.query(
    `SELECT DISTINCT pl.img AS img
       FROM planta pl
       JOIN poha_planta pp ON pp.idplanta = pl.idplanta
      WHERE pp.idpoha IN (${keptIdpoha.map(() => '?').join(',')})
        AND pl.img IN (${imagenValues.map(() => '?').join(',')})`,
    { replacements: [...keptIdpoha, ...imagenValues] }
  );
  const canonical = new Set(rows.map((r) => r.img));
  const kept = imgs.filter((i) => i.imagen && canonical.has(i.imagen));
  const dropped = imgs.filter((i) => !i.imagen || !canonical.has(i.imagen));
  return { kept, dropped };
}

/**
 * Extract the tool_use block from Claude's response content array.
 * Claude with tool_choice required always returns exactly one tool_use block.
 * @param {object} response Anthropic messages response
 * @returns {object} The tool input (already a plain JS object, not a JSON string)
 */
function extractToolResult(response) {
  const block = response.content.find((b) => b.type === 'tool_use');
  if (!block) {
    throw new Error('Claude response contained no tool_use block');
  }
  return block.input;
}

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
 * Drop-in replacement for nlpService.queryWithExplanation — same signature and
 * return contract.
 *
 * @param {string} pregunta User question (middleware already capped/sanitized).
 * @param {string|number} idusuario Firebase uid or legacy numeric id.
 * @returns {Promise<{ids:number[], explicacion:string, imagenes:object[], confianza?:number, fuera_de_dominio?:boolean, reason?:string}>}
 */
async function queryWithExplanation(pregunta, idusuario) {
  const preguntaSafe = aiGuardrails.sanitizeInput(pregunta);

  if (aiGuardrails.hasInjectionMarker(preguntaSafe)) {
    const decision = { reason: aiGuardrails.REASONS.INJECTION_DETECTED };
    metricsCounters[decision.reason] += 1;
    logGuardrail(decision, { stage: 'pre-call' });
    return buildRejectionResponse(decision.reason);
  }

  const catalogo = await catalogService.loadCatalog();

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

  let toolInput;
  try {
    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: aiGuardrails.buildSystemPrompt(catalogo),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        ...mensajesPrevios,
        { role: 'user', content: preguntaSafe },
      ],
      tools: [aiGuardrails.buildResponderTool()],
      tool_choice: { type: 'tool', name: 'responder_consulta' },
    });

    toolInput = extractToolResult(response);
  } catch (err) {
    console.error('claudeNlpService: Claude API error:', err.message);
    const decision = { reason: aiGuardrails.REASONS.SCHEMA_FAIL };
    metricsCounters[decision.reason] += 1;
    logGuardrail(decision, { stage: 'claude-call', error: err.message });
    return buildRejectionResponse(decision.reason);
  }

  if (toolInput.off_topic) {
    const decision = { reason: aiGuardrails.REASONS.FUERA_DE_DOMINIO };
    metricsCounters[decision.reason] += 1;
    logGuardrail(decision, { confianza: toolInput.confianza });
    return buildRejectionResponse(decision.reason);
  }

  const refsShape = aiGuardrails.validateRefs(toolInput.idpoha_refs);
  const refsDb = await crossCheckIdpoha(refsShape.kept);
  const keptRefs = refsDb.kept;
  if (refsDb.dropped.length > 0) {
    console.log(
      JSON.stringify({ event: 'ai.idpoha.dropped', count: refsDb.dropped.length, dropped: refsDb.dropped })
    );
  }

  // imagenes_refs from Claude: array of {nombre, nombre_cientifico, imagen}
  const rawImages = Array.isArray(toolInput.imagenes_refs) ? toolInput.imagenes_refs : [];
  const imgsDb = await crossCheckImages(rawImages, keptRefs);
  if (imgsDb.dropped.length > 0) {
    console.log(JSON.stringify({ event: 'ai.image.dropped', count: imgsDb.dropped.length }));
  }
  const keptImages = imgsDb.kept;

  const gate = aiGuardrails.shouldPersist({
    confianza: toolInput.confianza,
    off_topic: toolInput.off_topic,
    keptRefsCount: keptRefs.length,
  });
  metricsCounters[gate.reason] = (metricsCounters[gate.reason] || 0) + 1;
  logGuardrail(gate, { confianza: toolInput.confianza, ref_count: keptRefs.length });

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
        respuesta: toolInput.respuesta,
        idpoha_json: JSON.stringify(keptRefs),
        imagenes_json: JSON.stringify(keptImages),
      },
    }
  );

  return {
    ids: keptRefs,
    explicacion: toolInput.respuesta,
    imagenes: keptImages,
    confianza: toolInput.confianza,
    fuera_de_dominio: false,
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

function getMetrics() {
  return { ...metricsCounters };
}

module.exports = {
  queryWithExplanation,
  getChatHistory,
  getMetrics,
};
