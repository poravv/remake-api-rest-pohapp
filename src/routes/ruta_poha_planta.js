const express = require('express')
const ruta = express.Router();
const poha_planta = require('../model/poha_planta')
const { invalidateByPrefix } = require('../middleware/cache');

ruta.get('/get/', async (req, res) => {
    await poha_planta.findAll().then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/:idpoha_planta', async (req, res) => {
    await poha_planta.findByPk(req.params.idpoha_planta).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.post('/post/', async (req, res) => {
    await poha_planta.create(req.body).then((response) => {
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.put('/put/:idpoha_planta', async (req, res) => {
    await poha_planta.update(req.body, { where: { idpoha_planta: req.params.idpoha_planta } }).then((response) => {
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:idpoha_planta', async (req, res) => {
    await poha_planta.destroy({ where: { idpoha_planta: req.params.idpoha_planta } }).then((response) => {
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

// Eliminar todas las relaciones por poha+usuario (útil para edición segura)
ruta.delete('/delete-by-poha/:idpoha/:idusuario', async (req, res) => {
    const { idpoha, idusuario } = req.params;
    if (!idpoha || !idusuario) {
        return res.status(400).json({ error: 'idpoha e idusuario requeridos' });
    }
    await poha_planta.destroy({ where: { idpoha, idusuario } }).then((response) => {
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
        res.status(500).json({ error: 'Error eliminando relaciones poha_planta' });
    });
})


module.exports = ruta;
