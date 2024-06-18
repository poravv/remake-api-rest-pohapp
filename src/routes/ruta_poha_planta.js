const express = require('express')
const ruta = express.Router();
const poha_planta = require('../model/poha_planta')

ruta.get('/get/',async (req,res)=>{
    const rs_poha_planta = await poha_planta.findAll();
    res.json(rs_poha_planta);
})

ruta.get('/get/:idpoha_planta', async (req,res)=>{
    const rs_poha_planta = await poha_planta.findByPk(req.params.idpoha_planta);
    res.json(rs_poha_planta);
})

ruta.post('/post/', async (req,res)=>{
    const rs_poha_planta = await poha_planta.create(req.body);
    res.json(rs_poha_planta);
})

ruta.put('/put/:idpoha_planta',async(req,res)=>{
    const rs_poha_planta = await poha_planta.update(req.body,{where:{idpoha_planta:req.params.idpoha_planta}});
    res.json(rs_poha_planta);
})

ruta.delete('/delete/:idpoha_planta',async(req,res)=>{
    const rs_poha_planta = await poha_planta.destroy({where:{idpoha_planta:req.params.idpoha_planta}});
    res.json(rs_poha_planta);
})


module.exports=ruta;