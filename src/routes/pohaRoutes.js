/**
 * Rutas para la entidad Poha
 */
const express = require('express');
const router = express.Router();
const pohaController = require('../controllers/pohaController');

// Rutas GET
router.get('/', pohaController.obtenerTodos);
router.get('/buscar', pohaController.buscar);
router.get('/:id', pohaController.obtenerPorId);

// Rutas POST
router.post('/', pohaController.crear);

// Rutas PUT
router.put('/:id', pohaController.actualizar);

// Rutas DELETE
router.delete('/:id', pohaController.eliminar);

module.exports = router;