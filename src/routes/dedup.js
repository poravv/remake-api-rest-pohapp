const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  findSimilarPlantas,
  suggestDolencias,
  MIN_QUERY_LENGTH,
} = require('../services/dedupService');

const router = express.Router();

// Dedicated rate-limit: dedup is typed-debounced by the client, so
// a sane ceiling prevents abuse without throttling normal use.
const limiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

router.use(limiter);

/**
 * GET /api/pohapp/planta/similar?nombre=X&limit=5
 * Public. Returns up to `limit` PlantaPublic rows ordered by fuzzy
 * match quality (exact → prefix → contains → soundex).
 */
router.get('/planta/similar', async (req, res) => {
  try {
    const nombre = String(req.query.nombre ?? '').trim();
    if (nombre.length < MIN_QUERY_LENGTH) {
      return res.json({ items: [], reason: 'query_too_short' });
    }
    const items = await findSimilarPlantas(nombre, req.query.limit);
    res.json({ items });
  } catch (error) {
    console.error('Error /planta/similar:', error);
    res.status(500).json({ error: 'Error buscando plantas similares' });
  }
});

/**
 * GET /api/pohapp/dolencia/suggest?q=X&limit=5
 * Public. Returns up to `limit` DolenciaPublic rows matching the query.
 */
router.get('/dolencia/suggest', async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < MIN_QUERY_LENGTH) {
      return res.json({ items: [], reason: 'query_too_short' });
    }
    const items = await suggestDolencias(q, req.query.limit);
    res.json({ items });
  } catch (error) {
    console.error('Error /dolencia/suggest:', error);
    res.status(500).json({ error: 'Error sugiriendo dolencias' });
  }
});

module.exports = router;
