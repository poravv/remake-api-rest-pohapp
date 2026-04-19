/**
 * chat_historial search service.
 *
 * Two modes:
 *  - With `q`: MySQL FULLTEXT MATCH ... AGAINST in NATURAL LANGUAGE MODE on
 *    (pregunta, respuesta). Requires the ft_chat_historial_q_r ngram index
 *    created by migration_chat_historial_indexes.sql.
 *  - Without `q`: filter-only (user + date range) ordered by fecha DESC, id DESC.
 *
 * Pagination: opaque base64url cursor carrying `{ fecha, id }`. Results are
 * always ordered by (fecha DESC, id DESC); pagination advances by
 * `(fecha, id) < (cursor.fecha, cursor.id)`.
 */
const sequelize = require('../database');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Encode a `{fecha, id}` pair as a base64url opaque cursor. */
function encodeCursor(fecha, id) {
  const json = JSON.stringify({ fecha, id });
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Decode a cursor back to `{fecha, id}`, or null if malformed. */
function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const normalized = cursor.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.fecha !== 'string' && typeof parsed.fecha !== 'number') return null;
    if (!Number.isInteger(parsed.id)) return null;
    return { fecha: parsed.fecha, id: parsed.id };
  } catch (_err) {
    return null;
  }
}

function clampLimit(limit) {
  const n = Number.isInteger(limit) ? limit : parseInt(limit, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  if (n > MAX_LIMIT) return MAX_LIMIT;
  return n;
}

/**
 * Perform an authenticated chat history search.
 *
 * @param {object} params
 * @param {string|number} params.idusuario REQUIRED — scopes the search.
 * @param {string} [params.q] Optional FULLTEXT query.
 * @param {string} [params.fromDate] ISO-8601 lower bound (inclusive).
 * @param {string} [params.toDate] ISO-8601 upper bound (inclusive).
 * @param {string} [params.cursor] Opaque pagination cursor.
 * @param {number} [params.limit=20] Page size (max 50).
 * @returns {Promise<{items: object[], next_cursor: string|null}>}
 */
async function search({ idusuario, q, fromDate, toDate, cursor, limit }) {
  if (idusuario === undefined || idusuario === null || idusuario === '') {
    throw new Error('idusuario es requerido');
  }

  const pageSize = clampLimit(limit);
  const pageSizePlusOne = pageSize + 1;

  const cursorDecoded = cursor ? decodeCursor(cursor) : null;

  const replacements = { idusuario };
  const whereClauses = ['idusuario = :idusuario'];
  let orderScore = '';
  let selectScore = '';

  const hasQuery = typeof q === 'string' && q.trim().length > 0;
  if (hasQuery) {
    replacements.q = q.trim();
    whereClauses.push('MATCH(pregunta, respuesta) AGAINST(:q IN NATURAL LANGUAGE MODE)');
    selectScore = ', MATCH(pregunta, respuesta) AGAINST(:q IN NATURAL LANGUAGE MODE) AS score';
    orderScore = 'score DESC, ';
  }

  if (fromDate) {
    whereClauses.push('fecha >= :fromDate');
    replacements.fromDate = fromDate;
  }
  if (toDate) {
    whereClauses.push('fecha <= :toDate');
    replacements.toDate = toDate;
  }

  if (cursorDecoded) {
    whereClauses.push('(fecha < :cursorFecha OR (fecha = :cursorFecha AND id < :cursorId))');
    replacements.cursorFecha = cursorDecoded.fecha;
    replacements.cursorId = cursorDecoded.id;
  }

  replacements.pageSizePlusOne = pageSizePlusOne;

  const sql = `
    SELECT id, idusuario, pregunta, respuesta, fecha, idpoha_json, imagenes_json${selectScore}
      FROM chat_historial
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY ${orderScore}fecha DESC, id DESC
     LIMIT :pageSizePlusOne
  `;

  const [rows] = await sequelize.query(sql, { replacements });

  const hasMore = rows.length > pageSize;
  const items = (hasMore ? rows.slice(0, pageSize) : rows).map(toItem);

  let nextCursor = null;
  if (hasMore) {
    const last = items[items.length - 1];
    nextCursor = encodeCursor(last.fecha, last.id);
  }

  console.log(
    JSON.stringify({
      event: 'chat.search',
      idusuario: String(idusuario),
      has_query: hasQuery,
      results_count: items.length,
      has_more: hasMore,
    })
  );

  return { items, next_cursor: nextCursor };
}

/** Normalize a raw DB row to the public response shape. */
function toItem(row) {
  return {
    id: row.id,
    idusuario: row.idusuario,
    pregunta: row.pregunta,
    respuesta: row.respuesta,
    fecha: row.fecha instanceof Date ? row.fecha.toISOString() : row.fecha,
    idpoha_json: parseJsonSafe(row.idpoha_json),
    imagenes_json: parseJsonSafe(row.imagenes_json),
  };
}

function parseJsonSafe(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return raw;
  }
}

module.exports = {
  search,
  encodeCursor,
  decodeCursor,
  clampLimit,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
