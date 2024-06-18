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
    const rs_poha = await poha.count();
    res.json(rs_poha);
})

ruta.get('/get/', async (req, res) => {
    const rs_poha = await poha.findAll({
        include: [
            { model: autor },
            { model: poha_planta, include: [{ model: planta }] },
            { model: dolencias_poha, include: [{ model: dolencias }] }
        ]
    });
    res.json(rs_poha);
})


ruta.get('/getindex/:iddolencias/:te/:mate/:terere', async (req, res) => {
    
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.pageSize) || 10;
    // Calcula el offset
    const offset = (page) * pageSize;
    
    const rs_poha = await poha.findAll({
        limit: pageSize, offset: offset,
        include: [
            { model: autor, },
            {
                model: poha_planta, required: true,separate: true, include: [{
                    model: planta,
                    required: true,

                }]
            },
            {
                model: dolencias_poha, required: true,separate: true, include: [{
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
    });
    res.json(rs_poha);
})

ruta.get('/get/:iddolencias/:te/:mate/:terere', async (req, res) => {
    const rs_poha = await poha.findAll({
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
    });
    res.json(rs_poha);
})

ruta.get('/get/:idpoha', async (req, res) => {
    const rs_poha = await poha.findByPk(req.params.idpoha, {
        include: [
            { model: autor },
            { model: poha_planta, include: [{ model: planta }] },
            { model: dolencias_poha, include: [{ model: dolencias }] }
        ]
    });
    res.json(rs_poha);
})

ruta.post('/post/', async (req, res) => {
    try {
        const pohaguardado = await poha.create(req.body);

        res.json(pohaguardado);

    } catch (error) {
        console.log(error)
    }
})

ruta.put('/put/:idpoha', async (req, res) => {
    const rs_poha = await poha.update(req.body, { where: { idpoha: req.params.idpoha } });
    res.json(rs_poha);
})

ruta.delete('/delete/:idpoha', async (req, res) => {
    await poha.destroy({ where: { idpoha: req.params.idpoha } }).then((value) => {
        res.json(value);
    });

})


module.exports = ruta;