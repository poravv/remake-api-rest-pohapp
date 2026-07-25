const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const auditMiddleware = require('../../middleware/auditMiddleware');
const rateLimitAdmin = require('../../middleware/rateLimitAdmin');
const sequelize = require('../../database');
const planta = require('../../model/planta');
const poha = require('../../model/poha');
const dolencias = require('../../model/dolencias');
const contentModeration = require('../../services/contentModerationService');
const embeddingRegen = require('../../services/embeddingRegenService');
const { invalidateByPrefix } = require('../../middleware/cache');

const MAX_BATCH = 200;
const PENDING = 'PE';
const APPROVED = 'AC';

const MODEL_BY_TYPE = {
    planta: { model: planta, pk: 'idplanta', moderationKind: 'planta' },
    dolencia: { model: dolencias, pk: 'iddolencias', moderationKind: 'dolencia' },
    poha: { model: poha, pk: 'idpoha', moderationKind: 'poha' },
};

router.use(verifyToken, requireAdmin, rateLimitAdmin);

async function approveOne(type, id, transaction) {
    const entry = MODEL_BY_TYPE[type];
    if (!entry) {
        const err = new Error(`Tipo no soportado: ${type}`);
        err.code = 'UNSUPPORTED_TYPE';
        throw err;
    }
    const [rows] = await entry.model.update(
        { estado: APPROVED },
        { where: { [entry.pk]: id, estado: PENDING }, transaction }
    );
    return rows;
}

async function moderatePendingOne(type, id) {
    const entry = MODEL_BY_TYPE[type];
    const row = await entry.model.findByPk(id);
    // Do not send already-active/inactive rows to the AI. The guarded UPDATE
    // still remains the final authority for the transition.
    if (!row) return { status: 'not_found' };
    const content = typeof row.toJSON === 'function' ? row.toJSON() : row;
    if (content.estado !== PENDING) return { status: 'not_pending' };
    await contentModeration.moderateActivation(
        entry.moderationKind,
        { ...content, estado: APPROVED },
        { id: String(id), batch: true },
    );
    return { status: 'allowed' };
}

async function regenerateForApproved(type, id) {
    if (type === 'planta') return embeddingRegen.regenerateEmbeddingsForPlanta(id);
    if (type === 'dolencia') return embeddingRegen.regenerateEmbeddingsForDolencia(id);
    return embeddingRegen.regenerateEmbeddingForPoha(id);
}

/**
 * Dynamic audit wrapper: the action code embeds the body `type` so that
 * analytics can group bulk approvals by target kind.
 */
function bulkApproveAudit(req, res, next) {
    const type = String((req.body && req.body.type) || 'unknown').toLowerCase();
    return auditMiddleware(`bulk.approve.${type}`)(req, res, next);
}

/**
 * POST /api/pohapp/admin/bulk/approve
 * Body: { type: 'planta'|'dolencia'|'poha', ids: string[] }
 * Batch-transitions items from PE to AC inside a single Sequelize transaction.
 */
router.post('/approve', bulkApproveAudit, async (req, res) => {
    try {
        const { type, ids } = req.body || {};
        const normalizedType = String(type || '').toLowerCase();

        if (!MODEL_BY_TYPE[normalizedType]) {
            return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'type debe ser planta, dolencia o poha' } });
        }
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'ids debe ser un array con al menos 1 elemento' } });
        }
        if (ids.length > MAX_BATCH) {
            return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: `Máximo ${MAX_BATCH} elementos por batch` } });
        }

        const moderationFailures = new Map();
        for (const rawId of ids) {
            const id = String(rawId);
            try {
                // Moderate before opening the DB transaction. Network calls
                // must never hold a transaction open for a large batch.
                // eslint-disable-next-line no-await-in-loop
                const moderation = await moderatePendingOne(normalizedType, id);
                if (moderation.status !== 'allowed') {
                    moderationFailures.set(id, { code: 'NOT_FOUND_OR_NOT_PENDING' });
                }
            } catch (itemErr) {
                moderationFailures.set(id, {
                    code: itemErr.code || 'MODERATION_FAILED',
                    message: itemErr.message,
                });
            }
        }

        const tx = await sequelize.transaction();
        const results = [];
        let ok = 0;
        let failed = 0;
        try {
            for (const rawId of ids) {
                const id = String(rawId);
                try {
                    if (moderationFailures.has(id)) {
                        failed += 1;
                        results.push({ type: normalizedType, id, status: 'failed', error: moderationFailures.get(id) });
                        continue;
                    }
                    // eslint-disable-next-line no-await-in-loop
                    const rows = await approveOne(normalizedType, id, tx);
                    if (rows > 0) {
                        ok += 1;
                        results.push({ type: normalizedType, id, status: 'ok' });
                    } else {
                        failed += 1;
                        results.push({ type: normalizedType, id, status: 'failed', error: { code: 'NOT_FOUND_OR_NOT_PENDING' } });
                    }
                } catch (itemErr) {
                    failed += 1;
                    results.push({ type: normalizedType, id, status: 'failed', error: { code: itemErr.code || 'ERROR', message: itemErr.message } });
                }
            }
            await tx.commit();
        } catch (txErr) {
            try { await tx.rollback(); } catch (_e) { /* noop */ }
            console.error('admin.bulk.approve tx error:', txErr);
            return res.status(500).json({ error: { code: 'INTERNAL', message: txErr.message } });
        }

        for (const item of results.filter((entry) => entry.status === 'ok')) {
            try {
                // Keep embeddings sequential: one approval may fan out to
                // many active pohas and each call is hash-idempotent.
                // eslint-disable-next-line no-await-in-loop
                item.embeddingStatus = await regenerateForApproved(normalizedType, item.id);
            } catch (embeddingError) {
                item.embeddingStatus = { status: 'error', error: embeddingError.message };
            }
        }
        invalidateByPrefix(normalizedType === 'planta' ? 'plantas' : normalizedType === 'dolencia' ? 'dolencias' : 'poha');
        invalidateByPrefix('medicinales');

        res.json({
            summary: { total: ids.length, ok, failed },
            results,
        });
    } catch (err) {
        console.error('admin.bulk.approve error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

module.exports = router;
module.exports.MAX_BATCH = MAX_BATCH;
