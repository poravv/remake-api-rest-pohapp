const express = require('express');
const router = express.Router();
const nlpService = require('../services/nlpService');
const { validateNlpExplica } = require('../middleware/validation/nlp.validation');

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
router.post('/', requireJsonContentType, validateNlpExplica, async (req, res) => {
  const { pregunta, idusuario } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'Servicio de IA no configurado',
      message: 'Falta OPENAI_API_KEY en el backend',
    });
  }

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
