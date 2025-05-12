/**
 * Rutas para la entidad Poha_Planta (relación entre Poha y Planta)
 */
const express = require('express');
const router = express.Router();
const poha_plantaController = require('../controllers/poha_plantaController');

// Rutas GET
router.get('/', poha_plantaController.obtenerTodos);

// Esta ruta obtiene todas las plantas asociadas a un poha específico
router.get('/poha/:idpoha', poha_plantaController.obtenerPorPoha);

// Esta ruta obtiene todas los poha asociados a una planta específica
router.get('/planta/:idplanta', poha_plantaController.obtenerPorPlanta);

// Rutas POST
router.post('/', poha_plantaController.crear);

// Rutas DELETE
router.delete('/:idplanta/:idpoha/:idusuario', poha_plantaController.eliminar);

module.exports = router;