const express = require('express')
const ruta = express.Router();
const planta = require('../model/planta')
const database = require('../database')
const { QueryTypes } = require('sequelize');

ruta.get('/getsql/:nombre', async (req, res) => {
    await database.query(`select idplanta,nombre,descripcion,estado from planta where upper(nombre) like(upper('%${req.params.nombre}%'))`,
        { type: QueryTypes.SELECT }).then((response) => {
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            console.log(`Algo salió mal ${error}`);
        });

})

ruta.get('/getlimit/', async (req, res) => {
    try {
        await database.query('select * from planta limit 100', { type: QueryTypes.SELECT }).then((response) => {
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            console.log(`Algo salió mal ${error}`);
        });
    } catch (error) {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    }
})

ruta.get('/get/', async (req, res) => {
    await planta.findAll().then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/:idplanta', async (req, res) => {
    await planta.findByPk(req.params.idplanta).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.post('/post/', async (req, res) => {
    try {
        await planta.create(req.body).then((response) => {
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            console.log(`Algo salió mal ${error}`);
        });
    } catch (error) {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    }
})

ruta.put('/put/:idplanta', async (req, res) => {
    await planta.update(req.body, { where: { idplanta: req.params.idplanta } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:idplanta', async (req, res) => {
    await planta.destroy({ where: { idplanta: req.params.idplanta } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})


module.exports = ruta;