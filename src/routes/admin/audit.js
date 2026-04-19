const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const rateLimitAdmin = require('../../middleware/rateLimitAdmin');
const sequelize = require('../../database');
const { QueryTypes } = require('sequelize');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

router.use(verifyToken, requireAdmin, rateLimitAdmin);
// Intentionally NOT wrapped in auditMiddleware: this endpoint is read-only
// and MUST NOT write an audit row (spec: "Does not self-audit").

/**
 * Parse the opaque cursor: base64url of "<isoDate>|<id>". Returns null if
 * the string cannot be parsed.
 */
function decodeCursor(cursor) {
    if (!cursor) return null;
    try {
        const decoded = Buffer.from(String(cursor), 'base64url').toString('utf8');
        const [iso, idStr] = decoded.split('|');
        const id = parseInt(idStr, 10);
        if (!iso || Number.isNaN(id)) return null;
        return { iso, id };
    } catch (_err) {
        return null;
    }
}

function encodeCursor(iso, id) {
    return Buffer.from(`${iso}|${id}`, 'utf8').toString('base64url');
}

/**
 * GET /api/pohapp/admin/audit-log
 * Filters: actor_uid, action, target_type, from, to.
 * Pagination: cursor on (created_at DESC, id DESC).
 */
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
        const where = [];
        const replacements = {};

        if (req.query.actor_uid) {
            where.push('actor_uid = :actor_uid');
            replacements.actor_uid = String(req.query.actor_uid);
        }
        if (req.query.action) {
            where.push('action = :action');
            replacements.action = String(req.query.action);
        }
        if (req.query.target_type) {
            where.push('target_type = :target_type');
            replacements.target_type = String(req.query.target_type);
        }
        if (req.query.from) {
            where.push('created_at >= :from');
            replacements.from = String(req.query.from);
        }
        if (req.query.to) {
            where.push('created_at <= :to');
            replacements.to = String(req.query.to);
        }

        const cursor = decodeCursor(req.query.cursor);
        if (cursor) {
            where.push('(created_at < :cursor_iso OR (created_at = :cursor_iso AND id < :cursor_id))');
            replacements.cursor_iso = cursor.iso;
            replacements.cursor_id = cursor.id;
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const sql = `
            SELECT id, actor_uid, actor_email, action, target_type, target_id,
                   status, payload, ip, user_agent, created_at
            FROM audit_log
            ${whereSql}
            ORDER BY created_at DESC, id DESC
            LIMIT ${limit + 1}
        `;
        const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

        let nextCursor = null;
        const items = rows.slice(0, limit).map((r) => ({
            id: r.id,
            actor_uid: r.actor_uid,
            actor_email: r.actor_email,
            action: r.action,
            target_type: r.target_type,
            target_id: r.target_id,
            status: r.status,
            payload: typeof r.payload === 'string' ? safeParseJson(r.payload) : r.payload,
            ip: r.ip,
            user_agent: r.user_agent,
            created_at: r.created_at,
        }));
        if (rows.length > limit) {
            const last = items[items.length - 1];
            nextCursor = encodeCursor(
                last.created_at instanceof Date ? last.created_at.toISOString() : String(last.created_at),
                last.id
            );
        }

        res.json({ items, next_cursor: nextCursor });
    } catch (err) {
        console.error('admin.audit.list error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

function safeParseJson(v) {
    try { return JSON.parse(v); } catch (_e) { return v; }
}

module.exports = router;
