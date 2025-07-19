const express = require('express');
const router = express.Router();
const sequelize = require('../database');

router.get('/', async (req, res) => {
  const { idusuario } = req.query;

  if (!idusuario) {
    return res.status(400).json({ error: 'Falta el parámetro idusuario' });
  }

  try {
    const [historial] = await sequelize.query(`
      SELECT id, pregunta, respuesta, fecha, idpoha_json, imagenes_json
      FROM chat_historial
      WHERE idusuario = :idusuario
      ORDER BY fecha DESC
      LIMIT 50
    `, {
      replacements: { idusuario },
    });

    res.json({ historial });
  } catch (err) {
    console.error('❌ Error al obtener historial:', err);
    res.status(500).json({ error: 'No se pudo obtener el historial.' });
  }
});

module.exports = router;
