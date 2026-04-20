/**
 * Fuzzy similarity service for aportar flows.
 *
 * Returns plants / ailments whose names are close to a query string so
 * the client can warn the user "ya existe algo parecido, ¿te referís a
 * X?" BEFORE they submit a duplicate. Uses MySQL LIKE + SOUNDEX —
 * instant, zero external cost. Semantic (embedding) similarity is a
 * deliberate v2: the infra exists (see embeddingCache.js) but the
 * extra latency / OpenAI cost per keystroke is not worth it here.
 *
 * Results are ordered by match quality:
 *   0 exact case-insensitive
 *   1 starts-with prefix
 *   2 contains
 *   3 SOUNDEX collision
 */

const database = require('../database');
const { QueryTypes } = require('sequelize');

const MIN_QUERY_LENGTH = 2;
const MAX_LIMIT = 10;

function normalise(value) {
  return String(value ?? '').trim();
}

function clampLimit(requested) {
  const n = parseInt(requested, 10);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(n, MAX_LIMIT);
}

/**
 * Returns up to `limit` plantas whose `nombre` (or `nombre_cientifico`)
 * looks like the query. Only estado='AC' surface. Shape mirrors
 * PlantaPublic so the client can render the chip using its existing
 * card components.
 */
async function findSimilarPlantas(query, limit = 5) {
  const q = normalise(query);
  if (q.length < MIN_QUERY_LENGTH) return [];
  const safeLimit = clampLimit(limit);

  const rows = await database.query(
    `
    SELECT idplanta, nombre, nombre_cientifico, familia, img,
      CASE
        WHEN LOWER(nombre) = LOWER(:exact) THEN 0
        WHEN LOWER(nombre) LIKE LOWER(:prefix) THEN 1
        WHEN LOWER(nombre) LIKE LOWER(:contains) THEN 2
        WHEN LOWER(nombre_cientifico) LIKE LOWER(:contains) THEN 2
        WHEN SOUNDEX(nombre) = SOUNDEX(:exact) THEN 3
        ELSE 4
      END AS match_rank
    FROM planta
    WHERE estado = 'AC'
      AND (
        LOWER(nombre) LIKE LOWER(:contains)
        OR LOWER(nombre_cientifico) LIKE LOWER(:contains)
        OR SOUNDEX(nombre) = SOUNDEX(:exact)
      )
    ORDER BY match_rank, CHAR_LENGTH(nombre), nombre
    LIMIT :limit
    `,
    {
      replacements: {
        exact: q,
        prefix: `${q}%`,
        contains: `%${q}%`,
        limit: safeLimit,
      },
      type: QueryTypes.SELECT,
    },
  );

  return rows;
}

/**
 * Returns up to `limit` dolencias whose description looks like the
 * query string. Same ranking rules as plantas but matches only on
 * `descripcion`.
 */
async function suggestDolencias(query, limit = 5) {
  const q = normalise(query);
  if (q.length < MIN_QUERY_LENGTH) return [];
  const safeLimit = clampLimit(limit);

  const rows = await database.query(
    `
    SELECT iddolencias, descripcion,
      CASE
        WHEN LOWER(descripcion) = LOWER(:exact) THEN 0
        WHEN LOWER(descripcion) LIKE LOWER(:prefix) THEN 1
        WHEN LOWER(descripcion) LIKE LOWER(:contains) THEN 2
        WHEN SOUNDEX(descripcion) = SOUNDEX(:exact) THEN 3
        ELSE 4
      END AS match_rank
    FROM dolencias
    WHERE estado = 'AC'
      AND (
        LOWER(descripcion) LIKE LOWER(:contains)
        OR SOUNDEX(descripcion) = SOUNDEX(:exact)
      )
    ORDER BY match_rank, CHAR_LENGTH(descripcion), descripcion
    LIMIT :limit
    `,
    {
      replacements: {
        exact: q,
        prefix: `${q}%`,
        contains: `%${q}%`,
        limit: safeLimit,
      },
      type: QueryTypes.SELECT,
    },
  );

  return rows;
}

module.exports = {
  findSimilarPlantas,
  suggestDolencias,
  MIN_QUERY_LENGTH,
};
