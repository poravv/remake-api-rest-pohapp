const express = require('express')
const ruta = express.Router();
const puntos = require('../model/puntos')
const poha = require('../model/poha');
const usuario = require('../model/usuario');
const {
    validateCreatePuntos,
    validateUpdatePuntos,
    validateIdPuntos,
} = require('../middleware/validation/puntos.validation');

ruta.get('/get/', async (req, res) => {
    try {
        const response = await puntos.findAll({
            include: [
                { model: poha },
                { model: usuario }
            ]
        });
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.get('/get/:idpuntos', validateIdPuntos, async (req, res) => {
    try {
        const response = await puntos.findByPk(req.params.idpuntos, {
            include: [
                { model: poha },
                { model: usuario }
            ]
        });
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.post('/post/', validateCreatePuntos, async (req, res) => {
    try {
        const response = await puntos.create(req.body);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.put('/put/:idpuntos', validateUpdatePuntos, async (req, res) => {
    try {
        const response = await puntos.update(req.body, { where: { idpuntos: req.params.idpuntos } });
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.delete('/delete/:idpuntos', validateIdPuntos, async (req, res) => {
    try {
        const response = await puntos.destroy({ where: { idpuntos: req.params.idpuntos } });
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})


module.exports = ruta;
