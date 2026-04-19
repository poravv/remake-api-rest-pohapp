const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const auditMiddleware = require('../../middleware/auditMiddleware');
const rateLimitAdmin = require('../../middleware/rateLimitAdmin');
const adminMetricsService = require('../../services/adminMetricsService');

router.use(verifyToken, requireAdmin, rateLimitAdmin);

/**
 * GET /api/pohapp/admin/metrics/dashboard
 * Aggregate KPIs. In-process cached for 60 s to avoid hammering Firebase + MySQL.
 */
router.get('/dashboard', auditMiddleware('metrics.dashboard'), async (_req, res) => {
    try {
        const payload = await adminMetricsService.getDashboard();
        res.json(payload);
    } catch (err) {
        console.error('admin.metrics.dashboard error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

module.exports = router;
