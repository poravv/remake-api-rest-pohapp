const express = require('express')
const ruta = express.Router();
const planta = require('../model/planta')
const database = require('../database')
const { QueryTypes } = require('sequelize');


ruta.get('/getsql/:nombre',async (req,res)=>{
    const rs_planta = await database.query(`select idplanta,nombre,descripcion,estado from planta where upper(nombre) like(upper('%${req.params.nombre}%'))`,{ type: QueryTypes.SELECT })
    res.json(rs_planta);
})

ruta.get('/getlimit/',async (req,res)=>{
    try{
        const rs_planta = await database.query('select * from planta limit 100',{ type: QueryTypes.SELECT })
        res.json(rs_planta);
    }catch(e){
        console.log(e)
    }
})

ruta.get('/get/',async (req,res)=>{
    const rs_planta = await planta.findAll();
    res.json(rs_planta);
})

ruta.get('/get/:idplanta', async (req,res)=>{
    const rs_planta = await planta.findByPk(req.params.idplanta);
    res.json(rs_planta);
})

ruta.post('/post/', async (req,res)=>{
    try {
        const rs_planta = await planta.create(req.body);
    res.json(rs_planta);
    } catch (error) {
        return null;
    }
})

ruta.put('/put/:idplanta',async(req,res)=>{
    const rs_planta = await planta.update(req.body,{where:{idplanta:req.params.idplanta}});
    res.json(rs_planta);
})

ruta.delete('/delete/:idplanta',async(req,res)=>{
    const rs_planta = await planta.destroy({where:{idplanta:req.params.idplanta}});
    res.json(rs_planta);
})


module.exports=ruta;