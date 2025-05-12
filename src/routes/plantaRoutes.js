/**
 * Rutas para la entidad Planta
 */
const express = require('express');
const router = express.Router();
const plantaController = require('../controllers/plantaController');

// Rutas GET
router.get('/', (req, res) => {
  res.json({ mensaje: 'Ruta de planta funcionando' });
});

module.exports = router;