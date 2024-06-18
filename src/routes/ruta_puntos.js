const express = require('express')
const ruta = express.Router();
const puntos = require('../model/puntos')
const poha = require('../model/poha');
const usuario = require('../model/usuario');

ruta.get('/get/',async (req,res)=>{
    const rs_puntos = await puntos.findAll({
        include:[
            {model:poha},
            {model:usuario}
        ]
    });
    res.json(rs_puntos);
})

ruta.get('/get/:idpuntos', async (req,res)=>{
    const rs_puntos = await puntos.findByPk(req.params.idpuntos,{
        include:[
            {model:poha},
            {model:usuario}
        ]
    });
    res.json(rs_puntos);
})

ruta.post('/post/', async (req,res)=>{
    const rs_puntos = await puntos.create(req.body);
    res.json(rs_puntos);
})

ruta.put('/put/:idpuntos',async(req,res)=>{
    const rs_puntos = await puntos.update(req.body,{where:{idpuntos:req.params.idpuntos}});
    res.json(rs_puntos);
})

ruta.delete('/delete/:idpuntos',async(req,res)=>{
    const rs_puntos = await puntos.destroy({where:{idpuntos:req.params.idpuntos}});
    res.json(rs_puntos);
})


module.exports=ruta;