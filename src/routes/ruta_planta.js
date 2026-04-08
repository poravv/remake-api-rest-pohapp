const express = require('express')
const ruta = express.Router();
const plantaService = require('../services/plantaService');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const {
    validateCreatePlanta,
    validateUpdatePlanta,
    validateIdPlanta,
    validateModeration,
    validatePendientes,
    validateSearchNombre,
} = require('../middleware/validation/planta.validation');

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

ruta.get('/getsql/:nombre', validateSearchNombre, async (req, res) => {
    try {
        const response = await plantaService.searchByNombre(req.params.nombre.trim());
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.get('/getlimit/', async (req, res) => {
    try {
        const response = await plantaService.getPlantasLimited();
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.get('/usage', async (req, res) => {
    try {
        const response = await plantaService.getPlantasUsage();
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo uso de plantas' });
    }
});

ruta.get('/get/', async (req, res) => {
    const pagination = parsePagination(req, res);
    if (pagination === null && (req.query.page !== undefined || req.query.pageSize !== undefined)) {
        return;
    }
    try {
        const response = await plantaService.getAllPlantas(pagination);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.get('/get/:idplanta', validateIdPlanta, async (req, res) => {
    try {
        const response = await plantaService.getPlantaById(req.params.idplanta);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.post('/post/', verifyToken, validateCreatePlanta, async (req, res) => {
    try {
        const response = await plantaService.createPlanta(req.body, req.user);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: 'Error al crear planta' });
    }
})

ruta.put('/put/:idplanta', verifyToken, validateUpdatePlanta, async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'body requerido' });
    }
    try {
        const response = await plantaService.updatePlanta(req.params.idplanta, req.body);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.delete('/delete/:idplanta', verifyToken, validateIdPlanta, async (req, res) => {
    try {
        const response = await plantaService.deletePlanta(req.params.idplanta);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

// ============================================================
// ENDPOINTS DE MODERACION
// ============================================================

// Listar plantas pendientes de aprobacion (solo para admin)
ruta.get('/pendientes', verifyToken, requireAdmin, async (req, res) => {
    try {
        const response = await plantaService.getPendingPlantas();
        res.json(response);
    } catch (error) {
        console.error('Error obteniendo plantas pendientes:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// Aprobar planta pendiente (cambiar estado de PE a AC)
ruta.put('/aprobar/:idplanta', verifyToken, requireAdmin, async (req, res) => {
    try {
        const response = await plantaService.approvePlanta(req.params.idplanta);
        res.json(response);
    } catch (error) {
        console.error('Error aprobando planta:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// Rechazar planta pendiente (eliminar o marcar como inactiva)
ruta.put('/rechazar/:idplanta', verifyToken, requireAdmin, async (req, res) => {
    try {
        const response = await plantaService.rejectPlanta(req.params.idplanta);
        res.json(response);
    } catch (error) {
        console.error('Error rechazando planta:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});


module.exports = ruta;
