/**
 * Builds and caches the poha catalog string used as Claude's system prompt context.
 *
 * Cache strategy: Redis (primary) → in-memory fallback (via cacheClient).
 * Deterministic ORDER BY idpoha ensures identical strings across rebuilds,
 * which is required for Claude's prompt caching to yield cache hits.
 */

const { QueryTypes } = require('sequelize');
const sequelize = require('../database');
const { getRedisClient, isRedisReady, getFromMemory, setInMemory } = require('./cacheClient');

const CACHE_KEY = process.env.CLAUDE_CATALOG_CACHE_KEY || 'claude_catalog:v1';
const TTL_SECONDS = parseInt(process.env.CLAUDE_CATALOG_TTL_SECONDS || '3600', 10);

/**
 * Query vw_medicina_entrenamiento and serialize all pohas into a compact string
 * Claude can reference by [#idpoha] tag.
 * @returns {Promise<string>}
 */
async function buildCatalog() {
  const rows = await sequelize.query(
    'SELECT idpoha, texto_entrenamiento, plantas_detalle_json FROM vw_medicina_entrenamiento ORDER BY idpoha ASC',
    { type: QueryTypes.SELECT }
  );

  return rows
    .map((row) => {
      let entry = `[#${row.idpoha}]\n${row.texto_entrenamiento}`;

      const plantas = row.plantas_detalle_json
        ? (typeof row.plantas_detalle_json === 'string'
            ? JSON.parse(row.plantas_detalle_json)
            : row.plantas_detalle_json)
        : [];

      const imgs = plantas.filter((p) => p.imagen);
      if (imgs.length > 0) {
        entry += `\nImagenes: ${imgs.map((p) => `${p.nombre}|${p.imagen}`).join(', ')}`;
      }

      return entry;
    })
    .join('\n\n');
}

/**
 * Return the catalog string from Redis cache when available; build and store it on a miss.
 * @returns {Promise<string>}
 */
async function loadCatalog() {
  if (isRedisReady()) {
    try {
      const cached = await getRedisClient().get(CACHE_KEY);
      if (cached) {
        console.log(JSON.stringify({ event: 'catalog.cache.hit' }));
        return cached;
      }
    } catch (err) {
      console.error('catalogService.loadCatalog redis get error:', err.message);
    }
  } else {
    const cached = getFromMemory(CACHE_KEY);
    if (cached) {
      console.log(JSON.stringify({ event: 'catalog.cache.hit.memory' }));
      return cached;
    }
  }

  console.log(JSON.stringify({ event: 'catalog.cache.miss' }));
  const catalog = await buildCatalog();

  if (isRedisReady()) {
    try {
      await getRedisClient().set(CACHE_KEY, catalog, { EX: TTL_SECONDS });
    } catch (err) {
      console.error('catalogService.loadCatalog redis set error:', err.message);
    }
  } else {
    setInMemory(CACHE_KEY, catalog, TTL_SECONDS);
  }

  return catalog;
}

/**
 * Remove the catalog from cache (both Redis and in-memory fallback).
 */
async function invalidateCatalog() {
  if (isRedisReady()) {
    try {
      await getRedisClient().del(CACHE_KEY);
    } catch (err) {
      console.error('catalogService.invalidateCatalog redis del error:', err.message);
    }
  }
  // in-memory cache has no direct delete API; setInMemory with TTL=0 expires it immediately
  setInMemory(CACHE_KEY, null, 0);
}

/**
 * Force a fresh catalog build, store it in cache, and return rebuild stats.
 * Keeps the contract expected by the admin /regen endpoint.
 * @returns {Promise<{total:number, regenerated:number, skipped:number, errors:number}>}
 */
async function rebuildCatalog() {
  await invalidateCatalog();
  try {
    const catalog = await loadCatalog();
    const total = catalog.split('\n\n').filter((s) => s.trim().startsWith('[#')).length;
    return { total, regenerated: total, skipped: 0, errors: 0 };
  } catch (err) {
    console.error('catalogService.rebuildCatalog error:', err.message);
    return { total: 0, regenerated: 0, skipped: 0, errors: 1 };
  }
}

module.exports = {
  buildCatalog,
  loadCatalog,
  invalidateCatalog,
  rebuildCatalog,
};
