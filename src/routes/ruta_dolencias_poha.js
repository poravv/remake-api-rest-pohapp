const express = require('express')
const ruta = express.Router();
const dolencias_poha = require('../model/dolencias_poha')
const { invalidateByPrefix } = require('../middleware/cache');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const {
    validateCreateDolenciasPoha,
    validateUpdateDolenciasPoha,
    validateIdDolenciasPoha,
    validateDeleteByPoha,
} = require('../middleware/validation/dolenciasPoha.validation');

ruta.get('/get/', async (req, res) => {
    try {
        const rs_dolencias_poha = await dolencias_poha.findAll();
        res.json(rs_dolencias_poha);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.get('/get/:iddolencias_poha', validateIdDolenciasPoha, async (req, res) => {
    try {
        const response = await dolencias_poha.findByPk(req.params.iddolencias_poha);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.post('/post/', verifyToken, validateCreateDolenciasPoha, async (req, res) => {
    try {
        const response = await dolencias_poha.create(req.body);
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.put('/put/:iddolencias_poha', verifyToken, validateUpdateDolenciasPoha, async (req, res) => {
    try {
        const response = await dolencias_poha.update(req.body, { where: { iddolencias_poha: req.params.iddolencias_poha } });
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.delete('/delete/:iddolencias_poha', verifyToken, validateIdDolenciasPoha, async (req, res) => {
    try {
        const response = await dolencias_poha.destroy({ where: { iddolencias_poha: req.params.iddolencias_poha } });
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
        const response = await dolencias_poha.destroy({ where: { idpoha, idusuario } });
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error eliminando relaciones dolencias_poha' });
    }
})


module.exports = ruta;
