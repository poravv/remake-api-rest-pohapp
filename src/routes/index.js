/**
 * Configuración central de rutas de la API
 */
const express = require('express');
const router = express.Router();

// Importar rutas de recursos
const puntosRoutes = require('./puntosRoutes');
const pohaRoutes = require('./pohaRoutes');
const dolencias_pohaRoutes = require('./dolencias_pohaRoutes');
const plantaRoutes = require('./plantaRoutes');
const autorRoutes = require('./autorRoutes');
const poha_plantaRoutes = require('./poha_plantaRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const dolenciasRoutes = require('./dolenciasRoutes');
const medicinalesRoutes = require('./medicinalesRoutes');
const queryNLPExplica = require('./queryNLPExplica');
const queryNlpRoute = require('./queryNLP');
const chatHistorial = require('./chatHistorial');

// Definir prefijo base para las rutas API
const API_PREFIX = '/api/pohapp';

// Configurar rutas con sus respectivos prefijos
// Rutas nuevas
router.use(`${API_PREFIX}/puntos`, puntosRoutes);
router.use(`${API_PREFIX}/poha`, pohaRoutes);
router.use(`${API_PREFIX}/dolencias_poha`, dolencias_pohaRoutes);
router.use(`${API_PREFIX}/planta`, plantaRoutes);
router.use(`${API_PREFIX}/autor`, autorRoutes);
router.use(`${API_PREFIX}/poha_planta`, poha_plantaRoutes);
router.use(`${API_PREFIX}/usuario`, usuarioRoutes);
router.use(`${API_PREFIX}/dolencias`, dolenciasRoutes);
router.use(`${API_PREFIX}/medicinales`, medicinalesRoutes);
router.use(`${API_PREFIX}/query-nlp/explica`, queryNLPExplica);
router.use(`${API_PREFIX}/query-nlp/preview`, queryNlpRoute);
router.use(`${API_PREFIX}/chat/historial`, chatHistorial);
module.exports = router;
