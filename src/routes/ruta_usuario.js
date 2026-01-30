const express = require('express')
const ruta = express.Router();
const usuario = require('../model/usuario');

ruta.get('/get/', async (req, res) => {
    await usuario.findAll().then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/:idusuario', async (req, res) => {
    try {
        await usuario.findByPk(req.params.idusuario).then((response) => {
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

ruta.get('/correo/:correo', async (req, res) => {
    try {
        await usuario.findOne({ where: { correo: req.params.correo } }).then((response) => {
            if (response) {
                res.json(response);
            } else {
                res.status(404).json({ message: 'Usuario no encontrado' });
            }
        }).catch((error) => {
            console.error(error);
            console.log(`Algo salió mal ${error}`);
            res.status(500).json({ error: error.message });
        });
    } catch (error) {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
        res.status(500).json({ error: error.message });
    }
})

ruta.post('/post/', async (req, res) => {
    try {
        await usuario.create(req.body).then((response) => {
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

ruta.put('/put/:idusuario', async (req, res) => {
    await usuario.update(req.body, { where: { idusuario: req.params.idusuario } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:idusuario', async (req, res) => {
    await usuario.destroy({ where: { idusuario: req.params.idusuario } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})


module.exports = ruta;