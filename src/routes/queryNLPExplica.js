const express = require('express');
const router = express.Router();
const nlpService = require('../services/claudeNlpService');
const { validateNlpExplica } = require('../middleware/validation/nlp.validation');
const { verifyToken } = require('../middleware/auth');

/**
 * Reject any non-JSON Content-Type with 415 BEFORE express.urlencoded can
 * silently coerce it. The legacy urlencoded path was the source of broken
 * parsing in the old implementation.
 */
function requireJsonContentType(req, res, next) {
  // GET/HEAD never carry a body — skip.
  if (!req.is) return next();
  const ct = req.headers['content-type'];
  if (!ct) {
    return res.status(415).json({
      error: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Content-Type es requerido y debe ser application/json',
    });
  }
  if (!/application\/json/i.test(ct)) {
    return res.status(415).json({
      error: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Content-Type debe ser application/json',
    });
  }
  next();
}

/**
 * POST /api/pohapp/query-nlp/explica
 *
 * Body: { pregunta: string (<=500), idusuario: string|number }
 *
 * Returns a guardrailed AI response. When the guardrail gate rejects
 * (off-domain, low confidence, low similarity, no valid refs) the response
 * body carries `fuera_de_dominio: true` and NOTHING is written to
 * chat_historial.
 *
 * @returns 200 { ids, explicacion, imagenes, fuera_de_dominio?, reason? }
 * @returns 400 validation error (invalid pregunta / idusuario)
 * @returns 415 unsupported content type
 * @returns 429 rate-limit exceeded (aiLimiter: 30/min)
 * @returns 500 upstream OpenAI or DB failure
 * @returns 503 OPENAI_API_KEY not configured
 */
/**
 * @swagger
 * /api/pohapp/query-nlp/explica:
 *   post:
 *     tags: [IA]
 *     summary: Consulta NLP guardrailed sobre el dominio de pohã ñana
 *     description: >
 *       Endpoint IA con rate-limit dedicado (aiLimiter, 30 req/min).
 *       Content-Type application/json obligatorio. Cuando el guardrail
 *       rechaza la consulta como fuera-de-dominio, el body incluye
 *       `fuera_de_dominio: true` y NO se escribe en chat_historial.
 *     x-rate-limit-tier: ai
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NlpExplicaRequest' }
 *     responses:
 *       '200':
 *         description: Respuesta NLP (posiblemente guardrailed)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NlpResponse' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '415':
 *         description: Content-Type no soportado (debe ser application/json)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 *       '503':
 *         description: ANTHROPIC_API_KEY no configurada en el backend
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', verifyToken, requireJsonContentType, validateNlpExplica, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'Servicio de IA no configurado',
      message: 'Falta ANTHROPIC_API_KEY en el backend',
    });
  }

  // The client passes `idusuario` in the body for legacy telemetry, but the
  // real identity is always the token's uid. Pin telemetry to req.user.uid so
  // guests (or spoofed body values) can't pollute chat_historial metrics.
  const pregunta = req.body.pregunta;
  const idusuario = req.user.uid;

  try {
    const result = await nlpService.queryWithExplanation(pregunta, idusuario, {
      fueraDeDominio: req.fueraDeDominio === true,
    });
    res.json(result);
  } catch (error) {
    console.error('Error en /query-nlp/explica:', error);
    res.status(error.statusCode || 500).json({
      error: 'Error al generar la respuesta.',
      message: error?.message || 'Error desconocido',
    });
  }
});

module.exports = router;
