const sequelize = require('../database');
const { QueryTypes } = require('sequelize');

/**
 * Keys stripped from any payload before persistence.
 * Defined broad on purpose: the admin plane must never store auth material.
 */
const SENSITIVE_KEYS = new Set([
    'password',
    'newPassword',
    'idToken',
    'token',
    'authorization',
    'Authorization',
    'secret',
    'apiKey',
    'api_key',
]);

function sanitizePayload(value) {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) return value.map(sanitizePayload);
    if (typeof value !== 'object') return value;

    const clean = {};
    for (const [k, v] of Object.entries(value)) {
        if (SENSITIVE_KEYS.has(k)) continue;
        clean[k] = sanitizePayload(v);
    }
    return clean;
}

/**
 * Append one audit entry. Never throws: audit failures MUST NOT break the
 * business request that triggered them.
 *
 * @param {object} entry
 * @param {string} entry.actorUid     Firebase uid of the admin performing the action
 * @param {string} [entry.actorEmail] Admin email from the verified idToken
 * @param {string} entry.action       Dotted action code, e.g. 'user.disable'
 * @param {string} [entry.targetType] Entity kind, e.g. 'user' | 'planta' | 'upload'
 * @param {string|number} [entry.targetId] Entity identifier as string
 * @param {object} [entry.payload]    Arbitrary JSON; sensitive keys are stripped
 * @param {'ok'|'failed'|'partial'} [entry.status='ok']
 * @param {string} [entry.ip]         Client IP (first X-Forwarded-For hop)
 * @param {string} [entry.userAgent]  User-Agent header (truncated to 255)
 * @returns {Promise<{id:number}|null>} Inserted row id or null on failure
 */
async function log({
    actorUid,
    actorEmail = null,
    action,
    targetType = null,
    targetId = null,
    payload = null,
    status = 'ok',
    ip = null,
    userAgent = null,
} = {}) {
    if (!actorUid || !action) {
        console.error('audit_log insert skipped: actorUid and action are required');
        return null;
    }

    const cleanPayload = payload ? sanitizePayload(payload) : null;
    const safeUserAgent = userAgent ? String(userAgent).slice(0, 255) : null;
    const safeTargetId = targetId === null || targetId === undefined ? null : String(targetId);

    try {
        const [result] = await sequelize.query(
            `INSERT INTO audit_log
                (actor_uid, actor_email, action, target_type, target_id, payload, status, ip, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    actorUid,
                    actorEmail,
                    action,
                    targetType,
                    safeTargetId,
                    cleanPayload ? JSON.stringify(cleanPayload) : null,
                    status,
                    ip,
                    safeUserAgent,
                ],
                type: QueryTypes.INSERT,
            }
        );
        return { id: Array.isArray(result) ? result[0] : result };
    } catch (err) {
        console.error('audit_log insert failed:', err.message);
        return null;
    }
}

module.exports = {
    log,
    sanitizePayload,
    SENSITIVE_KEYS,
};
