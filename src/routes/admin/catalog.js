const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const auditMiddleware = require('../../middleware/auditMiddleware');
const rateLimitAdmin = require('../../middleware/rateLimitAdmin');
const {
    validateCatalogList,
    parseCatalogFilters,
} = require('../../middleware/validation/adminCatalog.validation');
const adminCatalogService = require('../../services/adminCatalogService');

// Auth chain. Rate limiter runs AFTER verifyToken so keyGenerator can key
// on req.user.uid instead of IP.
router.use(verifyToken, requireAdmin, rateLimitAdmin);

/**
 * GET /api/pohapp/admin/catalog/plantas
 * Admin list of plantas across all estados. Supports estado=AC|PE|IN|all.
 */
router.get(
    '/plantas',
    auditMiddleware('catalog.plantas.list'),
    validateCatalogList,
    async (req, res) => {
        try {
            const filters = parseCatalogFilters(req);
            const result = await adminCatalogService.listPlantas(filters);
            res.json(result);
        } catch (err) {
            console.error('admin.catalog.plantas error:', err);
            res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
        }
    },
);

/**
 * GET /api/pohapp/admin/catalog/dolencias
 * Admin list of dolencias across all estados.
 */
router.get(
    '/dolencias',
    auditMiddleware('catalog.dolencias.list'),
    validateCatalogList,
    async (req, res) => {
        try {
            const filters = parseCatalogFilters(req);
            const result = await adminCatalogService.listDolencias(filters);
            res.json(result);
        } catch (err) {
            console.error('admin.catalog.dolencias error:', err);
            res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
        }
    },
);

/**
 * GET /api/pohapp/admin/catalog/pohas
 * Admin list of pohas (remedios) with plantas + dolencias relations.
 */
router.get(
    '/pohas',
    auditMiddleware('catalog.pohas.list'),
    validateCatalogList,
    async (req, res) => {
        try {
            const filters = parseCatalogFilters(req);
            const result = await adminCatalogService.listPohas(filters);
            res.json(result);
        } catch (err) {
            console.error('admin.catalog.pohas error:', err);
            res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
        }
    },
);

module.exports = router;
