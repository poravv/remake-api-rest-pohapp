const express = require('express');
const router = express.Router();
const nlpService = require('../services/nlpService');
const { validateGetHistorial } = require('../middleware/validation/chatHistorial.validation');

router.get('/', validateGetHistorial, async (req, res) => {
  const { idusuario } = req.query;

  try {
    const result = await nlpService.getChatHistory(idusuario);
    res.json(result);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(err.statusCode || 500).json({ error: 'No se pudo obtener el historial.' });
  }
});

module.exports = router;
