/**
 * Reusable embedding regeneration pipeline.
 *
 * Shares its logic with `src/scripts/generarEmbeddings.js` so the behavior is
 * identical whether triggered by:
 *   - the nightly CronJob (script),
 *   - the admin retrain endpoint (this module),
 *   - or post-moderation hooks in pohaService (single-id path).
 *
 * Idempotent by hash: rows whose normalized resumen matches `embedding_hash`
 * skip the OpenAI call.
 */
const { OpenAI } = require('openai');
const sequelize = require('../database');
const embeddingCache = require('./embeddingCache');
const { invalidateByPrefix } = require('../middleware/cache');

const EMBEDDING_MODEL = 'text-embedding-3-small';

let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function buildResumen(row) {
  const dolencias = row.dolencias || '';
  const texto = row.texto_entrenamiento || '';
  return `Dolencias que trata: ${dolencias}. ${texto}`.trim();
}

async function fetchTrainingRow(idpoha) {
  const [rows] = await sequelize.query(
    `SELECT v.idpoha, v.texto_entrenamiento, v.dolencias, m.embedding_hash AS stored_hash
       FROM vw_medicina_entrenamiento v
       LEFT JOIN medicina_embeddings m ON m.idpoha = v.idpoha
      WHERE v.idpoha = :idpoha`,
    { replacements: { idpoha } },
  );
  return rows[0] || null;
}

async function fetchAllTrainingRows() {
  const [rows] = await sequelize.query(
    `SELECT v.idpoha, v.texto_entrenamiento, v.dolencias, m.embedding_hash AS stored_hash
       FROM vw_medicina_entrenamiento v
       LEFT JOIN medicina_embeddings m ON m.idpoha = v.idpoha`,
  );
  return rows;
}

/**
 * Regenerate a single poha's embedding. Idempotent by hash — returns
 * { status: 'regenerated' | 'skipped' | 'missing' | 'error', ... }.
 */
async function regenerateEmbeddingForPoha(idpoha) {
  if (!process.env.OPENAI_API_KEY) {
    return { status: 'error', idpoha, error: 'OPENAI_API_KEY not set' };
  }

  const row = await fetchTrainingRow(idpoha);
  if (!row || !row.texto_entrenamiento || row.texto_entrenamiento.trim() === '') {
    return { status: 'missing', idpoha };
  }

  const resumen = buildResumen(row);
  const hash = embeddingCache.hashOf(resumen);

  if (row.stored_hash === hash) {
    return { status: 'skipped', idpoha, reason: 'hash_match' };
  }

  try {
    const response = await getOpenAI().embeddings.create({
      model: EMBEDDING_MODEL,
      input: resumen,
    });
    const vector = response.data[0].embedding;

    await sequelize.query(
      `REPLACE INTO medicina_embeddings (idpoha, resumen, embedding, embedding_hash)
       VALUES (:idpoha, :resumen, :embedding, :embedding_hash)`,
      {
        replacements: {
          idpoha,
          resumen,
          embedding: JSON.stringify(vector),
          embedding_hash: hash,
        },
      },
    );

    await embeddingCache.set(hash, vector);
    invalidateByPrefix('medicinales');
    return { status: 'regenerated', idpoha };
  } catch (err) {
    console.error(`[embeddingRegen] idpoha ${idpoha}:`, err.message);
    return { status: 'error', idpoha, error: err.message };
  }
}

/**
 * Regenerate every embedding. Returns a summary.
 * Safe to call repeatedly — unchanged rows short-circuit via hash.
 */
async function regenerateAllEmbeddings() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY no configurada');
    err.statusCode = 503;
    throw err;
  }

  const rows = await fetchAllTrainingRows();
  const summary = {
    total: rows.length,
    regenerated: 0,
    skipped: 0,
    missing: 0,
    errors: 0,
    failed: [],
  };

  for (const row of rows) {
    if (!row.texto_entrenamiento || row.texto_entrenamiento.trim() === '') {
      summary.missing += 1;
      continue;
    }
    const result = await regenerateEmbeddingForPoha(row.idpoha);
    if (result.status === 'regenerated') summary.regenerated += 1;
    else if (result.status === 'skipped') summary.skipped += 1;
    else if (result.status === 'missing') summary.missing += 1;
    else {
      summary.errors += 1;
      summary.failed.push({ idpoha: row.idpoha, error: result.error });
    }
  }

  if (summary.regenerated > 0) invalidateByPrefix('medicinales');
  return summary;
}

async function deleteEmbeddingForPoha(idpoha) {
  await sequelize.query(
    `DELETE FROM medicina_embeddings WHERE idpoha = :idpoha`,
    { replacements: { idpoha } },
  );
  invalidateByPrefix('medicinales');
}

module.exports = {
  regenerateEmbeddingForPoha,
  regenerateAllEmbeddings,
  deleteEmbeddingForPoha,
};
