const express = require('express')
const ruta = express.Router();
const autor = require('../model/autor')

ruta.get('/get/',async (req,res)=>{
    const rs_autor = await autor.findAll();
    res.json(rs_autor);
})

ruta.get('/get/:idautor', async (req,res)=>{
    const rs_autor = await autor.findByPk(req.params.idautor);
    res.json(rs_autor);
})

ruta.post('/post/', async (req,res)=>{
    const rs_autor = await autor.create(req.body);
    res.json(rs_autor);
})

ruta.put('/put/:idautor',async(req,res)=>{
    const rs_autor = await autor.update(req.body,{where:{idautor:req.params.idautor}});
    res.json(rs_autor);
})

ruta.delete('/delete/:idautor',async(req,res)=>{
    const rs_autor = await autor.destroy({where:{idautor:req.params.idautor}});
    res.json(rs_autor);
})


module.exports=ruta;