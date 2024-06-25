const express = require('express');
const ruta = express.Router();
const autor = require('../model/autor');


ruta.get('/get/', async (req, res) => {
    const rs_autor = await autor.findAll();
    res.json(rs_autor);
})

ruta.get('/get/:idautor', async (req, res) => {
    await autor.findByPk(req.params.idautor).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });

})

ruta.post('/post/', async (req, res) => {
    await autor.create(req.body).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });

})

ruta.put('/put/:idautor', async (req, res) => {
    await autor.update(req.body, { where: { idautor: req.params.idautor } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.delete('/delete/:idautor', async (req, res) => {
    await autor.destroy({ where: { idautor: req.params.idautor } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})


module.exports = ruta;