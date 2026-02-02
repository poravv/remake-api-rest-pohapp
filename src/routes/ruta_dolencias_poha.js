const express = require('express')
const ruta = express.Router();
const dolencias_poha = require('../model/dolencias_poha')
const dolencias = require('../model/dolencias');
const poha = require('../model/poha');
const { invalidateByPrefix } = require('../middleware/cache');

ruta.get('/get/', async (req, res) => {
    const rs_dolencias_poha = await dolencias_poha.findAll();
    res.json(rs_dolencias_poha);
})

ruta.get('/get/:iddolencias_poha', async (req, res) => {
    await dolencias_poha.findByPk(req.params.iddolencias_poha).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.post('/post/', async (req, res) => {
    await dolencias_poha.create(req.body).then((response) => {
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.put('/put/:iddolencias_poha', async (req, res) => {
    await dolencias_poha.update(req.body, { where: { iddolencias_poha: req.params.iddolencias_poha } }).then((response) => {
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:iddolencias_poha', async (req, res) => {
    await dolencias_poha.destroy({ where: { iddolencias_poha: req.params.iddolencias_poha } }).then((response) => {
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
    await dolencias_poha.destroy({ where: { idpoha, idusuario } }).then((response) => {
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
        res.status(500).json({ error: 'Error eliminando relaciones dolencias_poha' });
    });
})


module.exports = ruta;
