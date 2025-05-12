/**
 * Rutas para la entidad Autor
 */
const express = require('express');
const router = express.Router();
const autorController = require('../controllers/autorController');

// Rutas GET
router.get('/', autorController.obtenerTodos);
router.get('/buscar', autorController.buscarPorNombre);
router.get('/:id', autorController.obtenerPorId);

// Rutas POST
router.post('/', autorController.crear);

// Rutas PUT
router.put('/:id', autorController.actualizar);

// Rutas DELETE
router.delete('/:id', autorController.eliminar);

module.exports = router;