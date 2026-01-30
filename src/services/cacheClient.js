const { createClient } = require('redis');

let redisClient = null;
let redisReady = false;
const inMemoryCache = new Map();

const hasRedisConfig = () => {
  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
};

const getRedisOptions = () => {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }
  return {
    socket: {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  };
};

const initRedis = async () => {
  if (!hasRedisConfig()) {
    return false;
  }

  try {
    redisClient = createClient(getRedisOptions());
    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      redisReady = false;
    });
    await redisClient.connect();
    redisReady = true;
    console.log('✅ Redis conectado');
    return true;
  } catch (err) {
    console.error('❌ No se pudo conectar a Redis:', err.message);
    redisReady = false;
    return false;
  }
};

const isRedisReady = () => redisReady && redisClient;

const getFromMemory = (key) => {
  const entry = inMemoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    inMemoryCache.delete(key);
    return null;
  }
  return entry.value;
};

const setInMemory = (key, value, ttlSeconds) => {
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  inMemoryCache.set(key, { value, expiresAt });
};

const invalidateByPrefix = async (prefix) => {
  if (!prefix) return;
  const pattern = `${prefix}:*`;

  if (isRedisReady()) {
    try {
      let cursor = 0;
      do {
        const result = await redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        if (result.keys.length) {
          await redisClient.del(result.keys);
        }
      } while (cursor !== 0);
    } catch (err) {
      console.error('⚠️ Error invalidando cache Redis:', err.message);
    }
    return;
  }

  for (const key of inMemoryCache.keys()) {
    if (key.startsWith(`${prefix}:`)) {
      inMemoryCache.delete(key);
    }
  }
};

module.exports = {
  initRedis,
  isRedisReady,
  hasRedisConfig,
  getRedisClient: () => redisClient,
  getFromMemory,
  setInMemory,
  invalidateByPrefix,
};
