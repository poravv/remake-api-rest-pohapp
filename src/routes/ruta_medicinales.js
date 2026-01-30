const express = require('express')
const ruta = express.Router();
const database = require('../database')
const { QueryTypes } = require('sequelize');

const parseIntParam = (value, name, res) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        res.status(400).json({ error: `${name} invalido` });
        return null;
    }
    return parsed;
};

const parsePagination = (req, res) => {
    const hasPage = req.query.page !== undefined;
    const hasPageSize = req.query.pageSize !== undefined;
    if (!hasPage && !hasPageSize) return null;

    const page = hasPage ? parseInt(req.query.page, 10) : 0;
    const pageSize = hasPageSize ? parseInt(req.query.pageSize, 10) : 50;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 0 || pageSize <= 0) {
        res.status(400).json({ error: 'paginacion invalida' });
        return null;
    }

    return {
        limit: pageSize,
        offset: page * pageSize,
    };
};

ruta.get('/get/', async (req, res) => {
    try {
        const pagination = parsePagination(req, res);
        if (pagination === null && (req.query.page !== undefined || req.query.pageSize !== undefined)) {
            return;
        }
        let query = `select * from vw_medicina`;
        const replacements = {};
        if (pagination) {
            query += ' limit :limit offset :offset';
            replacements.limit = pagination.limit;
            replacements.offset = pagination.offset;
        }
        await database.query(query, { type: QueryTypes.SELECT, replacements }).then((response) => {
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

ruta.get('/getid/:idpoha', async (req, res) => {
    try {
        const idpoha = parseIntParam(req.params.idpoha, 'idpoha', res);
        if (idpoha === null) return;
        const query = `select * from vw_medicina where idpoha = :idpoha`;
        await database
            .query(query, { replacements: { idpoha }, type: QueryTypes.SELECT })
            .then((response) => {
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

ruta.get('/get/:iddolencias-:te-:mate-:terere-:idplanta', async (req, res) => {
    //console.log("entra en get----")
    //console.log(req.params)
    try {
        const iddolencias = parseIntParam(req.params.iddolencias, 'iddolencias', res);
        if (iddolencias === null) return;
        const te = parseIntParam(req.params.te, 'te', res);
        if (te === null) return;
        const mate = parseIntParam(req.params.mate, 'mate', res);
        if (mate === null) return;
        const terere = parseIntParam(req.params.terere, 'terere', res);
        if (terere === null) return;
        const idplanta = parseIntParam(req.params.idplanta, 'idplanta', res);
        if (idplanta === null) return;

        const conditions = [`estado = 'AC'`];
        const replacements = [];

        if (iddolencias !== 0) {
            conditions.push('iddolencias like ?');
            replacements.push(`%,${iddolencias}%`);
        }
        if (te !== 0) {
            conditions.push('te = ?');
            replacements.push(te);
        }
        if (mate !== 0) {
            conditions.push('mate = ?');
            replacements.push(mate);
        }
        if (terere !== 0) {
            conditions.push('terere = ?');
            replacements.push(terere);
        }
        if (idplanta !== 0) {
            conditions.push('idplanta = ?');
            replacements.push(idplanta);
        }

        const query = `select * from vw_medicina where ${conditions.join(' and ')} limit 100`;

        const rs_planta = await database.query(query, {
            replacements,
            type: QueryTypes.SELECT,
        });
        res.json(rs_planta);

    } catch (error) {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    }

})



module.exports = ruta;
