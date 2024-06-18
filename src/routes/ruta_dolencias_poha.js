const express = require('express')
const ruta = express.Router();
const dolencias_poha = require('../model/dolencias_poha')
const dolencias = require('../model/dolencias');
const poha = require('../model/poha');

ruta.get('/get/',async (req,res)=>{
    const rs_dolencias_poha = await dolencias_poha.findAll();
    res.json(rs_dolencias_poha);
})

ruta.get('/get/:iddolencias_poha', async (req,res)=>{
    const rs_dolencias_poha = await dolencias_poha.findByPk(req.params.iddolencias_poha);
    res.json(rs_dolencias_poha);
})

ruta.post('/post/', async (req,res)=>{
    const rs_dolencias_poha = await dolencias_poha.create(req.body);
    res.json(rs_dolencias_poha);
})

ruta.put('/put/:iddolencias_poha',async(req,res)=>{
    const rs_dolencias_poha = await dolencias_poha.update(req.body,{where:{iddolencias_poha:req.params.iddolencias_poha}});
    res.json(rs_dolencias_poha);
})

ruta.delete('/delete/:iddolencias_poha',async(req,res)=>{
    const rs_dolencias_poha = await dolencias_poha.destroy({where:{iddolencias_poha:req.params.iddolencias_poha}});
    res.json(rs_dolencias_poha);
})


module.exports=ruta;