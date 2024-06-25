const express = require('express')
const ruta = express.Router();
const puntos = require('../model/puntos')
const poha = require('../model/poha');
const usuario = require('../model/usuario');

ruta.get('/get/', async (req, res) => {
    await puntos.findAll({
        include: [
            { model: poha },
            { model: usuario }
        ]
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.get('/get/:idpuntos', async (req, res) => {
    await puntos.findByPk(req.params.idpuntos, {
        include: [
            { model: poha },
            { model: usuario }
        ]
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.post('/post/', async (req, res) => {
    await puntos.create(req.body).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.put('/put/:idpuntos', async (req, res) => {
    await puntos.update(req.body, { where: { idpuntos: req.params.idpuntos } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.delete('/delete/:idpuntos', async (req, res) => {
    await puntos.destroy({ where: { idpuntos: req.params.idpuntos } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})


module.exports = ruta;