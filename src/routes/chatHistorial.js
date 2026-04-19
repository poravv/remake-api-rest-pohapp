const express = require('express');
const router = express.Router();
const nlpService = require('../services/nlpService');
const { validateGetHistorial } = require('../middleware/validation/chatHistorial.validation');

/**
 * @swagger
 * /api/pohapp/chat/historial:
 *   get:
 *     tags: [Chat]
 *     summary: Historial público de consultas NLP por usuario
 *     parameters:
 *       - name: idusuario
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         description: ID del usuario (Firebase UID o string).
 *     responses:
 *       '200':
 *         description: Historial de consultas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 historial:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ChatEntry' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
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
