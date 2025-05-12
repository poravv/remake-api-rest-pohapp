/**
 * Rutas para búsquedas de plantas medicinales
 */
const express = require('express');
const router = express.Router();
const medicinalesController = require('../controllers/medicinalesController');

// Rutas de búsqueda
router.get('/plantas/buscar', medicinalesController.buscarPorNombre);
router.get('/poha/buscar', medicinalesController.buscarPoha);
router.get('/poha/:id', medicinalesController.obtenerDetallePoha);
router.get('/dolencia/:idDolencia', medicinalesController.buscarPorDolencia);
router.get('/estadisticas', medicinalesController.obtenerEstadisticas);

module.exports = router;
