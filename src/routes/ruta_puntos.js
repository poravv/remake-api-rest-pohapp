const express = require('express')
const ruta = express.Router();
const puntos = require('../models/puntos')
const poha = require('../models/poha');
const usuario = require('../models/usuario');

ruta.get('/get/', async (req, res) => {
    await puntos.findAll({
        include: [
            { model: poha },
            { model: usuario }
        ]
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
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
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.post('/post/', async (req, res) => {
    await puntos.create(req.body).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.put('/put/:idpuntos', async (req, res) => {
    await puntos.update(req.body, { where: { idpuntos: req.params.idpuntos } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:idpuntos', async (req, res) => {
    await puntos.destroy({ where: { idpuntos: req.params.idpuntos } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})


module.exports = ruta;