/**
 * Redis-backed embedding cache keyed by SHA-256(text).
 * Falls back to the in-memory map inside cacheClient.js when Redis is down,
 * so correctness never depends on cache availability.
 *
 * Key layout: `embed:{sha256-hex}` -> JSON.stringify(number[])
 * Default TTL: 30 days.
 */
const crypto = require('crypto');
const {
  getRedisClient,
  isRedisReady,
  getFromMemory,
  setInMemory,
} = require('./cacheClient');

const KEY_PREFIX = 'embed:';
const DEFAULT_TTL_SECONDS = parseInt(
  process.env.EMBED_CACHE_TTL_SECONDS || '2592000', // 30 days
  10,
);

/** Lowercase + trim so semantically identical inputs share a cache slot. */
function normalizeForHash(text) {
  if (typeof text !== 'string') return '';
  return text.trim().toLowerCase();
}

/** SHA-256 hex of the normalized text. Pure; stable across processes. */
function hashOf(text) {
  const normalized = normalizeForHash(text);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function keyFor(hash) {
  return `${KEY_PREFIX}${hash}`;
}

/**
 * Get a cached embedding by hash.
 * @param {string} hash sha256 hex (see `hashOf`)
 * @returns {Promise<number[]|null>}
 */
async function get(hash) {
  if (!hash) return null;
  const key = keyFor(hash);

  if (isRedisReady()) {
    try {
      const raw = await getRedisClient().get(key);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      // Redis transient failure must not break the caller.
      console.warn('embeddingCache.get redis miss:', err.message);
    }
  }

  return getFromMemory(key);
}

/**
 * Store an embedding vector under the given hash.
 * TTL comes from EMBED_CACHE_TTL_SECONDS (default 30 days).
 * @param {string} hash sha256 hex
 * @param {number[]} embedding vector
 * @param {number} [ttlSeconds]
 */
async function set(hash, embedding, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!hash || !Array.isArray(embedding)) return;
  const key = keyFor(hash);
  const payload = JSON.stringify(embedding);

  if (isRedisReady()) {
    try {
      await getRedisClient().set(key, payload, { EX: ttlSeconds });
      return;
    } catch (err) {
      console.warn('embeddingCache.set redis error, falling back to memory:', err.message);
    }
  }

  setInMemory(key, embedding, ttlSeconds);
}

module.exports = {
  get,
  set,
  hashOf,
  normalizeForHash,
  KEY_PREFIX,
  DEFAULT_TTL_SECONDS,
};
