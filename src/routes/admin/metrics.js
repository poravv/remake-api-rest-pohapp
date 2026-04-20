const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const auditMiddleware = require('../../middleware/auditMiddleware');
const rateLimitAdmin = require('../../middleware/rateLimitAdmin');
const adminMetricsService = require('../../services/adminMetricsService');
const sequelize = require('../../database');

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

/**
 * GET /api/pohapp/admin/metrics/ai
 * AI assistant usage metrics derived from chat_historial. Off-domain
 * queries are NOT persisted there (per nlpService guardrails), so this
 * view only reports retained traffic. Cached 60s via the Cache-Control
 * header downstream.
 *
 * Response: {
 *   last7Days: number,
 *   last30Days: number,
 *   avgPerDayLast7: number,
 *   uniqueUsersLast7: number,
 *   dailyBreakdown: [{ day: 'YYYY-MM-DD', consultas: number }]
 * }
 */
router.get('/ai', auditMiddleware('metrics.ai'), async (_req, res) => {
    try {
        const [breakdown] = await Promise.all([
            sequelize.query(
                `SELECT DATE(fecha) AS day, COUNT(*) AS consultas
                   FROM chat_historial
                  WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                  GROUP BY DATE(fecha)
                  ORDER BY day ASC`,
                { type: QueryTypes.SELECT },
            ),
        ]);

        const [totals] = await sequelize.query(
            `SELECT
                SUM(CASE WHEN fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)  THEN 1 ELSE 0 END) AS l7,
                SUM(CASE WHEN fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS l30,
                COUNT(DISTINCT CASE WHEN fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN idusuario END) AS users7
               FROM chat_historial`,
            { type: QueryTypes.SELECT },
        );

        // Normalize to a padded 7-day timeline so the chart has stable X-axis
        // labels even on days with zero traffic.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const padded = [];
        const byDay = new Map(
            breakdown.map((r) => [String(r.day).slice(0, 10), Number(r.consultas)]),
        );
        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            padded.push({ day: key, consultas: byDay.get(key) || 0 });
        }

        const last7 = Number(totals?.l7 || 0);
        const last30 = Number(totals?.l30 || 0);
        const users7 = Number(totals?.users7 || 0);
        res.set('Cache-Control', 'private, max-age=60');
        res.json({
            last7Days: last7,
            last30Days: last30,
            avgPerDayLast7: Number((last7 / 7).toFixed(1)),
            uniqueUsersLast7: users7,
            dailyBreakdown: padded,
        });
    } catch (err) {
        console.error('admin.metrics.ai error:', err);
        res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
});

module.exports = router;
