/**
 * Rutas para la entidad Usuario
 */
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Rutas GET
router.get('/', usuarioController.obtenerTodos);

// Rutas POST
router.post('/', usuarioController.crear);

// Rutas PUT
router.put('/:idusuario', usuarioController.actualizar);

// Esta ruta obtiene un usuario específico por su ID
router.get('/:idusuario', usuarioController.obtenerPorId);

// Esta ruta verifica si un usuario es administrador
router.get('/admin/:idusuario', usuarioController.verificarAdmin);

module.exports = router;