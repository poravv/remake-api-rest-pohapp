const express = require('express')
const ruta = express.Router();
const database = require('../database')
const { QueryTypes } = require('sequelize');


ruta.get('/get/', async (req, res) => {
    try {

        const query = `select * from vw_medicina`;
        rs_planta = await database.query(query, { type: QueryTypes.SELECT })
        res.json(rs_planta);
    } catch (error) {
        return null
    }


})

ruta.get('/getid/:idpoha', async (req, res) => {
    try {

        const query = `select * from vw_medicina where idpoha = ${req.params.idpoha}`;
        rs_planta = await database.query(query, { type: QueryTypes.SELECT })
        res.json(rs_planta);
    } catch (error) {
        return null
    }


})

ruta.get('/get/:iddolencias-:te-:mate-:terere-:idplanta', async (req, res) => {
    //console.log("entra en get----")
    //console.log(req.params)
    try {
        var rs_planta;
        var dolencia = "";
        var te = "";
        var mate = "";
        var terere = "";
        var planta = "";

        if (req.params.iddolencias != '0') {
            dolencia = `and iddolencias like '%,${req.params.iddolencias}%'`
        }
        if (req.params.te != '0') {
            te = `and te = ${req.params.te}`
        }
        if (req.params.mate != '0') {
            mate = `and mate= ${req.params.mate}`
        }
        if (req.params.terere != '0') {
            terere = `and terere =${req.params.terere}`
        }
        if (req.params.idplanta != '0') {
            planta = `and idplanta= ${req.params.idplanta}`
        }

        var query = "";

        if (req.params.iddolencias == '0' && req.params.te == '0' && req.params.mate == '0' && req.params.terere == '0' && req.params.idplanta == '0') {

            query = `select * from vw_medicina where estado = 'AC' limit 100`;

        } else {

            query = `select * from vw_medicina where estado='AC' ${dolencia} ${te} ${mate} ${terere} ${planta} limit 100`;

        }

        //console.log(query)

        rs_planta = await database.query(query,{ type: QueryTypes.SELECT });
        res.json(rs_planta);

    } catch (error) {
        return null
    }

})



module.exports = ruta;