const express = require('express')
const ruta = express.Router();
const poha = require('../model/poha')
const dolencias_poha = require('../model/dolencias_poha');
const poha_planta = require('../model/poha_planta');
const autor = require('../model/autor');
const planta = require('../model/planta');
const dolencias = require('../model/dolencias');
const { Op } = require('sequelize');


ruta.get('/count/', async (req, res) => {
    await poha.count().then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})

ruta.get('/get/', async (req, res) => {
    await poha.findAll({
        include: [
            { model: autor },
            { model: poha_planta, include: [{ model: planta }] },
            { model: dolencias_poha, include: [{ model: dolencias }] }
        ]
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})


ruta.get('/getindex/:iddolencias/:te/:mate/:terere', async (req, res) => {

    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.pageSize) || 10;
    // Calcula el offset
    const offset = (page) * pageSize;

    await poha.findAll({
        limit: pageSize, offset: offset,
        include: [
            { model: autor, },
            {
                model: poha_planta, required: true, separate: true, include: [{
                    model: planta,
                    required: true,

                }]
            },
            {
                model: dolencias_poha, required: true, separate: true, include: [{
                    model: dolencias,
                    required: true,
                    where: {
                        [Op.and]: [
                            req.params.iddolencias != 0 ? { iddolencias: req.params.iddolencias } : 0 == 0
                        ],
                    },
                }]
            }
        ],
        where: {
            [Op.and]: [
                req.params.te != 0 ? { te: req.params.te } : 0 == 0,
                req.params.mate != 0 ? { mate: req.params.mate } : 0 == 0,
                req.params.terere != 0 ? { terere: req.params.terere } : 0 == 0,
            ],
        }
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})

ruta.get('/get/:iddolencias/:te/:mate/:terere', async (req, res) => {
    await poha.findAll({
        include: [
            { model: autor },
            {
                model: poha_planta, required: true, include: [{
                    model: planta,
                    required: true,
                }]
            },
            {
                model: dolencias_poha, required: true, include: [{
                    model: dolencias,
                    required: true,
                    where: {
                        [Op.and]: [
                            req.params.iddolencias != 0 ? { iddolencias: req.params.iddolencias } : 0 == 0
                        ],
                    },
                }]
            }
        ],
        where: {
            [Op.and]: [
                req.params.te != 0 ? { te: req.params.te } : 0 == 0,
                req.params.mate != 0 ? { mate: req.params.mate } : 0 == 0,
                req.params.terere != 0 ? { terere: req.params.terere } : 0 == 0,
            ],
        }
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})

ruta.get('/get/:idpoha', async (req, res) => {
    await poha.findByPk(req.params.idpoha, {
        include: [
            { model: autor },
            { model: poha_planta, include: [{ model: planta }] },
            { model: dolencias_poha, include: [{ model: dolencias }] }
        ]
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})

ruta.post('/post/', async (req, res) => {
    try {
        await poha.create(req.body).then((response) => {
            res.json(response);
        }).catch((error) => {
            res.status(500).json({ error: `Algo salió mal ${error}` });
        });

    } catch (error) {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    }
})

ruta.put('/put/:idpoha', async (req, res) => {
    await poha.update(req.body, { where: { idpoha: req.params.idpoha } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });
})

ruta.delete('/delete/:idpoha', async (req, res) => {
    await poha.destroy({ where: { idpoha: req.params.idpoha } }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        res.status(500).json({ error: `Algo salió mal ${error}` });
    });

})


module.exports = ruta;