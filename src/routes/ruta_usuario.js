const express = require('express')
const ruta = express.Router();
const usuario = require('../model/usuario')

ruta.get('/get/', async (req, res) => {
    const rs_usuario = await usuario.findAll();
    res.json(rs_usuario);
})

ruta.get('/get/:idusuario', async (req, res) => {
    try {
        const rs_usuario = await usuario.findByPk(req.params.idusuario);
        res.json(rs_usuario);
    } catch (error) {
        res.json({ error: "Error" });
    }
})

ruta.post('/post/', async (req, res) => {
    try {
        const rs_usuario = await usuario.create(req.body);
        res.json(rs_usuario);
    } catch (error) {
        res.json({ 'mensaje': 'Error en el registro' });
    }

})

ruta.put('/put/:idusuario', async (req, res) => {
    const rs_usuario = await usuario.update(req.body, { where: { idusuario: req.params.idusuario } });
    res.json(rs_usuario);
})

ruta.delete('/delete/:idusuario', async (req, res) => {
    const rs_usuario = await usuario.destroy({ where: { idusuario: req.params.idusuario } });
    res.json(rs_usuario);
})


module.exports = ruta;