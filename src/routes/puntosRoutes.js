/**
 * Rutas para la entidad Puntos
 */
const express = require('express');
const router = express.Router();
const puntosController = require('../controllers/puntosController');

// Rutas GET
router.get('/', puntosController.obtenerTodos);
router.get('/promedio/:idpoha', puntosController.obtenerPromedio);
router.get('/:idpoha/:idusuario', puntosController.obtenerPorId);

// Rutas POST
router.post('/', puntosController.crear);

// Rutas PUT
router.put('/:idpoha/:idusuario', puntosController.actualizar);

// Rutas DELETE
router.delete('/:idpoha/:idusuario', puntosController.eliminar);

module.exports = router;