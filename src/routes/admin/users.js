const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const auditMiddleware = require('../../middleware/auditMiddleware');
const rateLimitAdmin = require('../../middleware/rateLimitAdmin');
const firebaseAdminService = require('../../services/firebaseAdminService');
const adminUsersService = require('../../services/adminUsersService');

// ---------------------------------------------------------------------------
// Simple per-target rate limiter for password reset (3/hour per uid).
// In-memory only; acceptable because the limit is per-target, not per-user:
// the window resets when the process restarts, which is rare and benign here.
// ---------------------------------------------------------------------------
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX = 3;
const resetBuckets = new Map();

function checkResetRateLimit(uid) {
    const now = Date.now();
    const bucket = resetBuckets.get(uid) || [];
    const fresh = bucket.filter((t) => now - t < RESET_WINDOW_MS);
    if (fresh.length >= RESET_MAX) {
        return { allowed: false, retryAfterSec: Math.ceil((RESET_WINDOW_MS - (now - fresh[0])) / 1000) };
    }
    fresh.push(now);
    resetBuckets.set(uid, fresh);
    return { allowed: true };
}

// ---------------------------------------------------------------------------
// Shared auth chain applied to every sub-route. Rate limiter runs AFTER
// verifyToken so keyGenerator can key on req.user.uid instead of IP.
// ---------------------------------------------------------------------------
router.use(verifyToken, requireAdmin, rateLimitAdmin);

/**
 * GET /api/pohapp/admin/users
 * List Firebase users merged with MySQL profile. Cursor-based pagination.
 */
router.get('/', auditMiddleware('user.list'), async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
        const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
        const q = req.query.q ? String(req.query.q).slice(0, 120) : undefined;

        const result = await adminUsersService.listUsers({ limit, cursor, q });
        res.json(result);
    } catch (err) {
        console.error('admin.users.list error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

/**
 * GET /api/pohapp/admin/users/:uid
 * Merged detail: Firebase record + MySQL profile + custom claims.
 */
router.get('/:uid', auditMiddleware('user.get'), async (req, res) => {
    try {
        const detail = await adminUsersService.getUserDetail(req.params.uid);
        res.json(detail);
    } catch (err) {
        if (err && err.code === 'auth/user-not-found') {
            return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
        }
        console.error('admin.users.get error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

/**
 * POST /api/pohapp/admin/users/:uid/disable
 * Sets disabled=true in Firebase.
 */
router.post('/:uid/disable', auditMiddleware('user.disable'), async (req, res) => {
    try {
        if (req.user.uid === req.params.uid) {
            return res.status(409).json({ error: { code: 'SELF_ACTION_FORBIDDEN', message: 'No puedes deshabilitarte a ti mismo' } });
        }
        const updated = await firebaseAdminService.updateUser(req.params.uid, { disabled: true });
        res.json({ uid: updated.uid, disabled: true, updatedAt: new Date().toISOString() });
    } catch (err) {
        if (err && err.code === 'auth/user-not-found') {
            return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
        }
        console.error('admin.users.disable error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

/**
 * POST /api/pohapp/admin/users/:uid/enable
 * Sets disabled=false in Firebase.
 */
router.post('/:uid/enable', auditMiddleware('user.enable'), async (req, res) => {
    try {
        const updated = await firebaseAdminService.updateUser(req.params.uid, { disabled: false });
        res.json({ uid: updated.uid, disabled: false, updatedAt: new Date().toISOString() });
    } catch (err) {
        if (err && err.code === 'auth/user-not-found') {
            return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
        }
        console.error('admin.users.enable error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

/**
 * POST /api/pohapp/admin/users/:uid/reset-password
 * Generates a Firebase password reset link. Rate-limited 3/hour per target uid.
 */
router.post('/:uid/reset-password', auditMiddleware('user.reset_password'), async (req, res) => {
    try {
        const { uid } = req.params;
        const gate = checkResetRateLimit(uid);
        if (!gate.allowed) {
            res.set('Retry-After', String(gate.retryAfterSec));
            return res.status(429).json({ error: { code: 'TARGET_RATE_LIMIT', message: 'Máximo 3 resets por hora para este usuario' } });
        }

        const fbUser = await firebaseAdminService.getUser(uid);
        if (!fbUser.email) {
            return res.status(422).json({ error: { code: 'NO_EMAIL', message: 'El usuario no tiene email registrado' } });
        }
        const resetLink = await firebaseAdminService.generatePasswordResetLink(fbUser.email);
        res.json({
            uid,
            email: fbUser.email,
            resetLink,
        });
    } catch (err) {
        if (err && err.code === 'auth/user-not-found') {
            return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
        }
        console.error('admin.users.reset_password error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

/**
 * POST /api/pohapp/admin/users/:uid/verify-email
 * Flips emailVerified=true in Firebase.
 */
router.post('/:uid/verify-email', auditMiddleware('user.verify_email'), async (req, res) => {
    try {
        const updated = await firebaseAdminService.updateUser(req.params.uid, { emailVerified: true });
        res.json({ uid: updated.uid, emailVerified: true });
    } catch (err) {
        if (err && err.code === 'auth/user-not-found') {
            return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
        }
        console.error('admin.users.verify_email error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

/**
 * DELETE /api/pohapp/admin/users/:uid
 * Transactional delete (MySQL tx → Firebase; rollback on Firebase failure).
 */
router.delete('/:uid', auditMiddleware('user.delete'), async (req, res) => {
    try {
        if (req.user.uid === req.params.uid) {
            return res.status(409).json({ error: { code: 'SELF_ACTION_FORBIDDEN', message: 'No puedes eliminarte a ti mismo' } });
        }
        const result = await adminUsersService.deleteUserTransactional(req.params.uid);
        res.json(result);
    } catch (err) {
        const status = err.statusCode || 500;
        const code = err.code || 'INTERNAL';
        if (status >= 500) {
            res.locals.auditStatus = 'partial';
            console.error('admin.users.delete error:', err);
        }
        res.status(status).json({ error: { code, message: err.message } });
    }
});

module.exports = router;
module.exports._resetBuckets = resetBuckets;
