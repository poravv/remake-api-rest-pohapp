const rateLimit = require('express-rate-limit');
const { getRedisClient, isRedisReady } = require('../services/cacheClient');

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 300;

/**
 * Build a RedisStore instance if rate-limit-redis and an active Redis client
 * are available. Falls back to undefined (memory store) when either is missing.
 */
function buildRedisStore() {
    try {
        const { default: RedisStore } = require('rate-limit-redis');
        const client = getRedisClient();
        if (!client || !isRedisReady()) return null;
        return new RedisStore({
            sendCommand: (...args) => client.sendCommand(args),
            prefix: 'rl:admin:',
        });
    } catch (_err) {
        return null;
    }
}

/**
 * Rate limiter for /admin/* — 300 req/min keyed by the authenticated
 * actor uid (fallback to IP when no auth context is present yet).
 *
 * Uses rate-limit-redis when Redis is configured and ready; otherwise the
 * default in-memory store (per-process). Install `rate-limit-redis` to
 * enable cross-pod rate limiting in multi-replica deployments.
 *
 * MUST be registered AFTER verifyToken so req.user.uid is available.
 */
const rateLimitAdmin = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildRedisStore() || undefined,
    keyGenerator: (req) => {
        if (req.user && req.user.uid) return `uid:${req.user.uid}`;
        return `ip:${req.ip}`;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Demasiadas solicitudes, intenta de nuevo en un minuto',
        });
    },
});

module.exports = rateLimitAdmin;
module.exports.WINDOW_MS = WINDOW_MS;
module.exports.MAX_REQUESTS = MAX_REQUESTS;
module.exports.buildRedisStore = buildRedisStore;
