const express = require('express');
const router = express.Router();
const retrievalService = require('../services/retrievalService');
const { validateNlpPreview } = require('../middleware/validation/nlp.validation');

router.post('/', validateNlpPreview, async (req, res) => {
  const { pregunta } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'Servicio de IA no configurado',
      message: 'Falta OPENAI_API_KEY en el backend',
    });
  }

  try {
    const result = await retrievalService.queryPreview(pregunta);
    res.json(result);
  } catch (err) {
    console.error('Error en /query-nlp/preview:', err);
    res.status(err.statusCode || 500).json({
      error: 'Error al procesar la pregunta',
      message: err?.message || 'Error desconocido',
    });
  }
});

module.exports = router;
