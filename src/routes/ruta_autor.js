const express = require('express');
const ruta = express.Router();
const autor = require('../model/autor');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const {
    validateCreateAutor,
    validateUpdateAutor,
    validateIdAutor,
} = require('../middleware/validation/autor.validation');

ruta.get('/get/', async (req, res) => {
    try {
        const rs_autor = await autor.findAll();
        res.json(rs_autor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.get('/get/:idautor', validateIdAutor, async (req, res) => {
    try {
        const response = await autor.findByPk(req.params.idautor);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.post('/post/', verifyToken, validateCreateAutor, async (req, res) => {
    try {
        const response = await autor.create(req.body);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.put('/put/:idautor', verifyToken, validateUpdateAutor, async (req, res) => {
    try {
        const response = await autor.update(req.body, { where: { idautor: req.params.idautor } });
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

ruta.delete('/delete/:idautor', verifyToken, validateIdAutor, async (req, res) => {
    try {
        const response = await autor.destroy({ where: { idautor: req.params.idautor } });
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

module.exports = ruta;
