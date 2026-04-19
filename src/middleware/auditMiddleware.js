const auditLogService = require('../services/auditLogService');

/**
 * Derives a dotted action code from an Express request when none is supplied.
 * Example: POST /admin/users/abc/disable -> 'post.users.disable'.
 */
function deriveAction(req) {
    const rawPath = (req.baseUrl || '') + (req.route && req.route.path ? req.route.path : req.path || '');
    const segments = rawPath
        .split('/')
        .filter(Boolean)
        .filter((s) => !s.startsWith(':'))
        .filter((s) => !/^[0-9]+$/.test(s))
        .filter((s) => s.toLowerCase() !== 'api' && s.toLowerCase() !== 'pohapp' && s.toLowerCase() !== 'admin');
    const verb = (req.method || 'GET').toLowerCase();
    return [verb, ...segments].join('.') || verb;
}

function extractTarget(req) {
    const params = req.params || {};
    if (params.uid) return { targetType: 'user', targetId: params.uid };
    if (params.idusuario) return { targetType: 'user', targetId: params.idusuario };
    if (params.idplanta) return { targetType: 'planta', targetId: params.idplanta };
    if (params.iddolencia) return { targetType: 'dolencia', targetId: params.iddolencia };
    if (params.idpoha) return { targetType: 'poha', targetId: params.idpoha };
    // Body-level targets (actions like set-claim pass targetUid in the body).
    const body = req.body || {};
    if (body.targetUid) return { targetType: 'user', targetId: body.targetUid };
    const paramKeys = Object.keys(params);
    if (paramKeys.length === 1) {
        return { targetType: null, targetId: params[paramKeys[0]] };
    }
    return { targetType: null, targetId: null };
}

function extractIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const first = String(forwarded).split(',')[0].trim();
        if (first) return first.slice(0, 45);
    }
    return (req.ip || '').slice(0, 45) || null;
}

/**
 * Admin audit middleware. Logs one row to `audit_log` AFTER the response
 * finishes, using the status code to decide `ok` (<400) vs `failed` (>=400).
 * MUST be placed after `verifyToken` so `req.user` is available.
 *
 * @param {string} [actionOverride] Optional explicit action code
 * @returns {import('express').RequestHandler}
 */
function auditMiddleware(actionOverride) {
    return function audit(req, res, next) {
        const startedAt = Date.now();
        res.on('finish', () => {
            const user = req.user || {};
            if (!user.uid) return;

            const statusCode = res.statusCode || 500;
            const status = statusCode >= 400 ? 'failed' : 'ok';
            const { targetType, targetId } = extractTarget(req);

            auditLogService.log({
                actorUid: user.uid,
                actorEmail: user.email || null,
                action: actionOverride || deriveAction(req),
                targetType,
                targetId,
                payload: {
                    method: req.method,
                    path: req.originalUrl || req.url,
                    body: req.body,
                    query: req.query,
                    statusCode,
                    durationMs: Date.now() - startedAt,
                },
                status,
                ip: extractIp(req),
                userAgent: req.headers['user-agent'] || null,
            });
        });
        next();
    };
}

module.exports = auditMiddleware;
module.exports.deriveAction = deriveAction;
module.exports.extractTarget = extractTarget;
