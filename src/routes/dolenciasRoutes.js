/**
 * Rutas para la entidad Dolencias
 */
const express = require('express');
const router = express.Router();
const dolenciasController = require('../controllers/dolenciasController');

// Rutas GET
router.get('/', dolenciasController.obtenerTodos);
router.get('/buscar', dolenciasController.buscarPorDescripcion);
router.get('/:id', dolenciasController.obtenerPorId);

// Rutas POST
router.post('/', dolenciasController.crear);

// Rutas PUT
router.put('/:id', dolenciasController.actualizar);

// Rutas DELETE
router.delete('/:id', dolenciasController.eliminar);

module.exports = router;