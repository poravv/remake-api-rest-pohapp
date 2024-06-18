const express = require('express')
const ruta = express.Router();
const dolencias = require('../model/dolencias')
const database = require('../database')
const { QueryTypes } = require('sequelize');


ruta.get('/getsql/:descripcion', async (req, res) => {
    const rs_planta = await database.query(`select * from dolencias where upper(descripcion) like(upper('%${req.params.descripcion}%'))`, { type: QueryTypes.SELECT })
    res.json(rs_planta);
})

ruta.get('/get/', async (req, res) => {
    const rs_dolencias = await dolencias.findAll();
    res.json(rs_dolencias);
})

ruta.get('/get/:iddolencias', async (req, res) => {
    const rs_dolencias = await dolencias.findByPk(req.params.iddolencias);
    res.json(rs_dolencias);
})

ruta.post('/post/', async (req, res) => {
    try {
        const rs_dolencias = await dolencias.create(req.body);
        res.json(rs_dolencias);
    } catch (error) {
        return null;
    }
})

ruta.put('/put/:iddolencias', async (req, res) => {
    const rs_dolencias = await dolencias.update(req.body, { where: { iddolencias: req.params.iddolencias } });
    res.json(rs_dolencias);
})

ruta.delete('/delete/:iddolencias', async (req, res) => {
    const rs_dolencias = await dolencias.destroy({ where: { iddolencias: req.params.iddolencias } });
    res.json(rs_dolencias);
})


module.exports = ruta;