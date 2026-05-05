const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const rateLimitAdmin = require('../../middleware/rateLimitAdmin');
const catalogRegen = require('../../services/catalogRegenService');

router.use(verifyToken, requireAdmin, rateLimitAdmin);

/**
 * @swagger
 * /api/pohapp/admin/embeddings/regenerate:
 *   post:
 *     tags: [Admin]
 *     summary: Regenera todos los embeddings (idempotente por hash)
 *     description: >
 *       Ejecuta la misma pipeline que el CronJob nocturno pero de forma
 *       síncrona y retorna un resumen. Filas cuyo resumen no cambió se
 *       saltean (skipped). Requiere rol admin.
 *     responses:
 *       '200':
 *         description: Resumen del retrain
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 regenerated: { type: integer }
 *                 skipped: { type: integer }
 *                 missing: { type: integer }
 *                 errors: { type: integer }
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idpoha: { type: integer }
 *                       error: { type: string }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '503':
 *         description: Error al reconstruir el catálogo Claude
 */
router.post('/regenerate', async (_req, res) => {
  try {
    const summary = await catalogRegen.regenerateCatalog();
    res.json(summary);
  } catch (err) {
    console.error('[admin/embeddings] catalog rebuild failed:', err);
    res.status(err.statusCode || 500).json({
      error: 'Error regenerando catálogo',
      message: err.message,
    });
  }
});

/**
 * @swagger
 * /api/pohapp/admin/embeddings/regenerate/{idpoha}:
 *   post:
 *     tags: [Admin]
 *     summary: Regenera el embedding de una sola poha
 *     parameters:
 *       - name: idpoha
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Resultado puntual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [regenerated, skipped, missing, error]
 *                 idpoha: { type: integer }
 */
router.post('/regenerate/:idpoha', async (req, res) => {
  const idpoha = parseInt(req.params.idpoha, 10);
  if (!Number.isFinite(idpoha) || idpoha <= 0) {
    return res.status(400).json({ error: 'idpoha invalido' });
  }
  try {
    const result = await catalogRegen.invalidateCatalogForPoha(idpoha);
    res.json(result);
  } catch (err) {
    console.error('[admin/embeddings] single catalog invalidation failed:', err);
    res.status(err.statusCode || 500).json({
      error: 'Error invalidando catálogo',
      message: err.message,
    });
  }
});

module.exports = router;
