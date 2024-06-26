const express = require('express')
const ruta = express.Router();
const puntos = require('../model/puntos')
const poha = require('../model/poha');
const usuario = require('../model/usuario');
//const graylogLogger = require('../middleware/graylog');

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
        //graylogLogger.log(`Algo salió mal ${error}`);
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
        //graylogLogger.log(`Algo salió mal ${error}`);
    });
})

ruta.post('/post/', async (req, res) => {
    await puntos.create(req.body).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        //graylogLogger.log(`Algo salió mal ${error}`);
    });
})

ruta.put('/put/:idpuntos', async (req, res) => {
    await puntos.update(req.body, { where: { idpuntos: req.params.idpuntos } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        //graylogLogger.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:idpuntos', async (req, res) => {
    await puntos.destroy({ where: { idpuntos: req.params.idpuntos } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        //graylogLogger.log(`Algo salió mal ${error}`);
    });
})


module.exports = ruta;