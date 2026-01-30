const express = require('express')
const ruta = express.Router();
const dolencias = require('../model/dolencias')
const database = require('../database')
const { QueryTypes } = require('sequelize');
const { invalidateByPrefix } = require('../middleware/cache');

ruta.use((req, res, next) => {
    if (req.params && req.params.iddolencias !== undefined) {
        const id = parseInt(req.params.iddolencias, 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'iddolencias invalido' });
        }
    }
    next();
});

const isNonEmptyString = (value) =>
    typeof value === 'string' && value.trim().length > 0;

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

ruta.get('/getsql/:descripcion', async (req, res) => {
    const descripcion = (req.params.descripcion || '').trim();
    if (!descripcion) {
        return res.status(400).json({ error: 'descripcion requerida' });
    }
    await database
        .query(
            'select * from dolencias where upper(descripcion) like upper(:descripcion)',
            { replacements: { descripcion: `%${descripcion}%` }, type: QueryTypes.SELECT },
        )
        .then((response) => {
            res.json(response);
        })
        .catch((error) => {
            console.error(error);
            console.log(`Algo salió mal ${error}`);
        });
})

ruta.get('/get/', async (req, res) => {
    const pagination = parsePagination(req, res);
    if (pagination === null && (req.query.page !== undefined || req.query.pageSize !== undefined)) {
        return;
    }
    await dolencias.findAll({ ...(pagination || {}) }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/:iddolencias', async (req, res) => {
    await dolencias.findByPk(req.params.iddolencias).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.post('/post/', async (req, res) => {
    try {
        const { descripcion, estado } = req.body || {};
        if (!isNonEmptyString(descripcion) || !isNonEmptyString(estado)) {
            return res.status(400).json({ error: 'descripcion y estado son requeridos' });
        }
        await dolencias.create(req.body).then((response) => {
            invalidateByPrefix('dolencias');
            invalidateByPrefix('medicinales');
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            console.log(`Algo salió mal ${error}`);
        });
    } catch (error) {
        console.log(`Algo salió mal ${error}`);
    }
})

ruta.put('/put/:iddolencias', async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'body requerido' });
    }
    await dolencias.update(req.body, { where: { iddolencias: req.params.iddolencias } }).then((response) => {
        invalidateByPrefix('dolencias');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:iddolencias', async (req, res) => {
    await dolencias.destroy({ where: { iddolencias: req.params.iddolencias } }).then((response) => {
        invalidateByPrefix('dolencias');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})


module.exports = ruta;
