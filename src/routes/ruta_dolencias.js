const express = require('express')
const ruta = express.Router();
const dolenciasService = require('../services/dolenciasService');
const {
    validateCreateDolencias,
    validateUpdateDolencias,
    validateIdDolencias,
    validateModeration,
    validatePendientes,
    validateSearchDescripcion,
} = require('../middleware/validation/dolencias.validation');

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

ruta.get('/getsql/:descripcion', validateSearchDescripcion, async (req, res) => {
    try {
        const response = await dolenciasService.searchByDescripcion(req.params.descripcion.trim());
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.get('/usage', async (req, res) => {
    try {
        const response = await dolenciasService.getDolenciasUsage();
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo uso de dolencias' });
    }
});

ruta.get('/get/', async (req, res) => {
    const pagination = parsePagination(req, res);
    if (pagination === null && (req.query.page !== undefined || req.query.pageSize !== undefined)) {
        return;
    }
    try {
        const response = await dolenciasService.getAllDolencias(pagination);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.get('/get/:iddolencias', validateIdDolencias, async (req, res) => {
    try {
        const response = await dolenciasService.getDolenciasById(req.params.iddolencias);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.post('/post/', validateCreateDolencias, async (req, res) => {
    try {
        const response = await dolenciasService.createDolencias(req.body);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.put('/put/:iddolencias', validateUpdateDolencias, async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'body requerido' });
    }
    try {
        const response = await dolenciasService.updateDolencias(req.params.iddolencias, req.body);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.delete('/delete/:iddolencias', validateIdDolencias, async (req, res) => {
    try {
        const response = await dolenciasService.deleteDolencias(req.params.iddolencias);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

// ============================================================
// ENDPOINTS DE MODERACION (solo admin)
// ============================================================

ruta.get('/pendientes', validatePendientes, async (req, res) => {
    try {
        const response = await dolenciasService.getPendingDolencias(req.query.idusuario);
        res.json(response);
    } catch (error) {
        console.error('Error obteniendo dolencias pendientes:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

ruta.put('/aprobar/:iddolencias', validateModeration, async (req, res) => {
    try {
        const response = await dolenciasService.approveDolencias(req.params.iddolencias, req.body.idusuario);
        res.json(response);
    } catch (error) {
        console.error('Error aprobando dolencia:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

ruta.put('/rechazar/:iddolencias', validateModeration, async (req, res) => {
    try {
        const response = await dolenciasService.rejectDolencias(req.params.iddolencias, req.body.idusuario);
        res.json(response);
    } catch (error) {
        console.error('Error rechazando dolencia:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

module.exports = ruta;
