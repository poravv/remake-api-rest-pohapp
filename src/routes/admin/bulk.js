const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const auditMiddleware = require('../../middleware/auditMiddleware');
const rateLimitAdmin = require('../../middleware/rateLimitAdmin');
const sequelize = require('../../database');
const planta = require('../../model/planta');
const poha = require('../../model/poha');
const dolencias = require('../../model/dolencias');

const MAX_BATCH = 200;
const PENDING = 'PE';
const APPROVED = 'AC';

const MODEL_BY_TYPE = {
    planta: { model: planta, pk: 'idplanta' },
    dolencia: { model: dolencias, pk: 'iddolencias' },
    poha: { model: poha, pk: 'idpoha' },
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

        const tx = await sequelize.transaction();
        const results = [];
        let ok = 0;
        let failed = 0;
        try {
            for (const rawId of ids) {
                const id = String(rawId);
                try {
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
