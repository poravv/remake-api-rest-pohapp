const express = require('express');
const router = express.Router();
const nlpService = require('../services/nlpService');
const { validateNlpExplica } = require('../middleware/validation/nlp.validation');

router.post('/', validateNlpExplica, async (req, res) => {
  const { pregunta, idusuario } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'Servicio de IA no configurado',
      message: 'Falta OPENAI_API_KEY en el backend',
    });
  }

  try {
    const result = await nlpService.queryWithExplanation(pregunta, idusuario);
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
