/**
 * Rutas para la entidad Dolencias_poha
 */
const express = require('express');
const router = express.Router();
const dolencias_pohaController = require('../controllers/dolencias_pohaController');

// Rutas GET
router.get('/', dolencias_pohaController.obtenerTodos);
router.get('/poha/:idpoha', dolencias_pohaController.obtenerPorPoha);
router.get('/dolencia/:iddolencias', dolencias_pohaController.obtenerPorDolencia);

// Rutas POST
router.post('/', dolencias_pohaController.crear);

// Rutas DELETE
router.delete('/:iddolencias/:idpoha/:idusuario', dolencias_pohaController.eliminar);

module.exports = router;