const express = require('express')
const ruta = express.Router();
const poha_planta = require('../model/poha_planta')

ruta.get('/get/', async (req, res) => {
    await poha_planta.findAll().then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.get('/get/:idpoha_planta', async (req, res) => {
    await poha_planta.findByPk(req.params.idpoha_planta).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.post('/post/', async (req, res) => {
    await poha_planta.create(req.body).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.put('/put/:idpoha_planta', async (req, res) => {
    await poha_planta.update(req.body, { where: { idpoha_planta: req.params.idpoha_planta } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.delete('/delete/:idpoha_planta', async (req, res) => {
    await poha_planta.destroy({ where: { idpoha_planta: req.params.idpoha_planta } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})


module.exports = ruta;