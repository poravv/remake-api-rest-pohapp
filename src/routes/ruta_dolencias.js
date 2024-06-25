const express = require('express')
const ruta = express.Router();
const dolencias = require('../model/dolencias')
const database = require('../database')
const { QueryTypes } = require('sequelize');


ruta.get('/getsql/:descripcion', async (req, res) => {
    await database.query(`select * from dolencias where upper(descripcion) like(upper('%${req.params.descripcion}%'))`,
        { type: QueryTypes.SELECT }).then((response) => {
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            res.status(500).json({ error: `Algo salió mal ${error}` });
        });
})

ruta.get('/get/', async (req, res) => {
    await dolencias.findAll().then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})

ruta.get('/get/:iddolencias', async (req, res) => {
    await dolencias.findByPk(req.params.iddolencias).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})

ruta.post('/post/', async (req, res) => {
    try {
        await dolencias.create(req.body).then((response) => {
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            res.status(500).json({ error: `Algo salió mal ${error}` });
        });
    } catch (error) {
        res.status(500).json({ error: `Algo salió mal ${error}` });
    }
})

ruta.put('/put/:iddolencias', async (req, res) => {
    await dolencias.update(req.body, { where: { iddolencias: req.params.iddolencias } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})

ruta.delete('/delete/:iddolencias', async (req, res) => {
    await dolencias.destroy({ where: { iddolencias: req.params.iddolencias } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})


module.exports = ruta;