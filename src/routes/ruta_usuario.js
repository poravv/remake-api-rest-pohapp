const express = require('express')
const ruta = express.Router();
const usuario = require('../model/usuario')

ruta.get('/get/', async (req, res) => {
    await usuario.findAll().then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.get('/get/:idusuario', async (req, res) => {
    try {
        await usuario.findByPk(req.params.idusuario).then((response) => {
            res.json(response);
        }).catch((error) => {
            next(error);
        });
    } catch (error) {
        next(error);
    }
})

ruta.post('/post/', async (req, res) => {
    try {
        await usuario.create(req.body).then((response) => {
            res.json(response);
        }).catch((error) => {
            next(error);
        });
    } catch (error) {
        next(error);
    }

})

ruta.put('/put/:idusuario', async (req, res) => {
    await usuario.update(req.body, { where: { idusuario: req.params.idusuario } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})

ruta.delete('/delete/:idusuario', async (req, res) => {
    await usuario.destroy({ where: { idusuario: req.params.idusuario } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        next(error);
    });
})


module.exports = ruta;