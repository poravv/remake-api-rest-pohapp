const {
  isRedisReady,
  getRedisClient,
  getFromMemory,
  setInMemory,
  invalidateByPrefix,
} = require('../services/cacheClient');

const buildCacheKey = (prefix, req) => {
  const signingMarker = process.env.MINIO_ENDPOINT || '';
  return `${prefix}:${signingMarker}:${req.originalUrl}`;
};

const cacheMiddleware = ({ ttlSeconds = 300, prefix = 'cache' } = {}) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.query.disableCache === 'true') return next();

    const cacheKey = buildCacheKey(prefix, req);

    try {
      if (isRedisReady()) {
        const cached = await getRedisClient().get(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(JSON.parse(cached));
        }
      } else {
        const cached = getFromMemory(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(JSON.parse(cached));
        }
      }
    } catch (err) {
      console.error('⚠️ Cache error:', err.message);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      try {
        if (res.statusCode < 400) {
          const payload = JSON.stringify(data);
          if (isRedisReady()) {
            getRedisClient().setEx(cacheKey, ttlSeconds, payload);
          } else {
            setInMemory(cacheKey, payload, ttlSeconds);
          }
          res.setHeader('X-Cache', 'MISS');
        }
      } catch (err) {
        console.error('⚠️ Cache store error:', err.message);
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidateByPrefix,
};
