const express = require('express')
const ruta = express.Router();
const poha_planta = require('../model/poha_planta')
const { invalidateByPrefix } = require('../middleware/cache');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const {
    validateCreatePohaPlanta,
    validateUpdatePohaPlanta,
    validateIdPohaPlanta,
    validateDeleteByPoha,
} = require('../middleware/validation/pohaPlanta.validation');

ruta.get('/get/', async (req, res) => {
    try {
        const response = await poha_planta.findAll();
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.get('/get/:idpoha_planta', validateIdPohaPlanta, async (req, res) => {
    try {
        const response = await poha_planta.findByPk(req.params.idpoha_planta);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.post('/post/', verifyToken, validateCreatePohaPlanta, async (req, res) => {
    try {
        const response = await poha_planta.create(req.body);
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.put('/put/:idpoha_planta', verifyToken, validateUpdatePohaPlanta, async (req, res) => {
    try {
        const response = await poha_planta.update(req.body, { where: { idpoha_planta: req.params.idpoha_planta } });
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.delete('/delete/:idpoha_planta', verifyToken, validateIdPohaPlanta, async (req, res) => {
    try {
        const response = await poha_planta.destroy({ where: { idpoha_planta: req.params.idpoha_planta } });
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

// Eliminar todas las relaciones por poha+usuario (util para edicion segura)
ruta.delete('/delete-by-poha/:idpoha/:idusuario', verifyToken, validateDeleteByPoha, async (req, res) => {
    try {
        const { idpoha, idusuario } = req.params;
        const response = await poha_planta.destroy({ where: { idpoha, idusuario } });
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error eliminando relaciones poha_planta' });
    }
})


module.exports = ruta;
