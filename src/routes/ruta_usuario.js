const express = require('express')
const ruta = express.Router();
const usuario = require('../model/usuario');
const graylogLogger = require('../middleware/graylog');

ruta.get('/get/', async (req, res) => {
    await usuario.findAll().then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        graylogLogger.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/:idusuario', async (req, res) => {
    try {
        await usuario.findByPk(req.params.idusuario).then((response) => {
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            graylogLogger.log(`Algo salió mal ${error}`);
        });
    } catch (error) {
        console.error(error); 
        graylogLogger.log(`Algo salió mal ${error}`);
    }
})

ruta.post('/post/', async (req, res) => {
    try {
        await usuario.create(req.body).then((response) => {
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            graylogLogger.log(`Algo salió mal ${error}`);
        });
    } catch (error) {
        console.error(error); 
        graylogLogger.log(`Algo salió mal ${error}`);
    }

})

ruta.put('/put/:idusuario', async (req, res) => {
    await usuario.update(req.body, { where: { idusuario: req.params.idusuario } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        graylogLogger.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:idusuario', async (req, res) => {
    await usuario.destroy({ where: { idusuario: req.params.idusuario } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        graylogLogger.log(`Algo salió mal ${error}`);
    });
})


module.exports = ruta;