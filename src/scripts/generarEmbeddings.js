/**
 * Idempotent embedding regeneration for medicina_embeddings.
 *
 * Strategy: compute SHA-256 over the normalized `resumen` text. If the hash
 * stored in `embedding_hash` matches the recomputed hash, we skip the OpenAI
 * call. Rows with NULL hash or changed hash are regenerated and the hash is
 * persisted in the same REPLACE INTO.
 *
 * Prereq: run migration_medicina_embeddings_hash.sql once (adds the column).
 *
 * Scheduling: recommended daily CronJob at 03:00 UTC (low-traffic window).
 * Example K8s snippet:
 *
 *   schedule: "0 3 * * *"
 *   jobTemplate:
 *     spec:
 *       template:
 *         spec:
 *           containers:
 *             - name: embed-regen
 *               image: pohapp-api:latest
 *               command: ["node", "src/scripts/generarEmbeddings.js"]
 *           restartPolicy: OnFailure
 *
 * Exit codes:
 *   0 — every row processed successfully (regenerated or skipped).
 *   non-zero — at least one row failed; surviving rows were still persisted.
 */
require('dotenv').config();
const { OpenAI } = require('openai');
const sequelize = require('../database');
const embeddingCache = require('../services/embeddingCache');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = 'text-embedding-3-small';

function buildResumen(row) {
  const dolencias = row.dolencias || '';
  const texto = row.texto_entrenamiento || '';
  return `Dolencias que trata: ${dolencias}. ${texto}`.trim();
}

async function main() {
  const [resultados] = await sequelize.query(`
    SELECT v.idpoha, v.texto_entrenamiento, v.dolencias, m.embedding_hash AS stored_hash
      FROM vw_medicina_entrenamiento v
      LEFT JOIN medicina_embeddings m ON m.idpoha = v.idpoha
  `);

  let total = 0;
  let regenerated = 0;
  let skipped = 0;
  let errores = 0;

  for (const fila of resultados) {
    total += 1;

    if (!fila.texto_entrenamiento || fila.texto_entrenamiento.trim() === '') {
      console.warn(`[skip] idpoha ${fila.idpoha}: sin texto_entrenamiento`);
      errores += 1;
      continue;
    }

    const resumen = buildResumen(fila);
    const hash = embeddingCache.hashOf(resumen);

    if (fila.stored_hash && fila.stored_hash === hash) {
      skipped += 1;
      continue;
    }

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: resumen,
      });
      const vector = response.data[0].embedding;

      await sequelize.query(
        `REPLACE INTO medicina_embeddings (idpoha, resumen, embedding, embedding_hash)
         VALUES (:idpoha, :resumen, :embedding, :embedding_hash)`,
        {
          replacements: {
            idpoha: fila.idpoha,
            resumen,
            embedding: JSON.stringify(vector),
            embedding_hash: hash,
          },
        }
      );

      // Also populate Redis cache so runtime hits it immediately.
      await embeddingCache.set(hash, vector);
      regenerated += 1;
    } catch (err) {
      console.error(`[error] idpoha ${fila.idpoha}:`, err.message);
      errores += 1;
    }
  }

  console.log(
    JSON.stringify({
      event: 'embeddings.regen.summary',
      total,
      regenerated,
      skipped,
      errors: errores,
    })
  );

  process.exit(errores > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[fatal] generarEmbeddings:', err);
  process.exit(1);
});
