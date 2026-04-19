const express = require('express');
const router = express.Router();
const chatSearchService = require('../services/chatSearchService');
const { verifyToken } = require('../middleware/auth');
const { validateChatSearch } = require('../middleware/validation/chatSearch.validation');

/**
 * POST /api/pohapp/chat/search
 *
 * Body:
 *   idusuario: string|number (required)
 *   q: string (optional, <=200)
 *   from_date: ISO-8601 (optional)
 *   to_date: ISO-8601 (optional)
 *   cursor: base64url string (optional, opaque)
 *   limit: integer (optional, default 20, max 50)
 *
 * Response: { items: [...], next_cursor: string|null }
 *
 * Gated by verifyToken + aiLimiter (30/min) applied at the router mount point.
 *
 * @returns 200 search results
 * @returns 400 validation error
 * @returns 401 unauthenticated
 * @returns 429 rate-limit exceeded
 * @returns 500 service error
 */
router.post('/', verifyToken, validateChatSearch, async (req, res) => {
  try {
    const { idusuario, q, from_date, to_date, cursor, limit } = req.body || {};
    if (idusuario === undefined || idusuario === null || idusuario === '') {
      return res.status(400).json({ error: 'INVALID_USER', message: 'idusuario es requerido' });
    }

    const result = await chatSearchService.search({
      idusuario,
      q,
      fromDate: from_date,
      toDate: to_date,
      cursor,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('Error en /chat/search:', error);
    res.status(error.statusCode || 500).json({
      error: 'CHAT_SEARCH_ERROR',
      message: error?.message || 'No se pudo completar la busqueda',
    });
  }
});

module.exports = router;
