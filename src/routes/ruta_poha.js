const express = require('express')
const ruta = express.Router();
const pohaService = require('../services/pohaService');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const {
    validateCreatePoha,
    validateUpdatePoha,
    validateIdPoha,
    validateModeration,
    validatePendientes,
} = require('../middleware/validation/poha.validation');

const parsePagination = (req, res) => {
    const hasPage = req.query.page !== undefined;
    const hasPageSize = req.query.pageSize !== undefined;
    if (!hasPage && !hasPageSize) return null;

    const page = hasPage ? parseInt(req.query.page, 10) : 0;
    const pageSize = hasPageSize ? parseInt(req.query.pageSize, 10) : 20;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 0 || pageSize <= 0) {
        res.status(400).json({ error: 'paginacion invalida' });
        return null;
    }

    return {
        limit: pageSize,
        offset: page * pageSize,
    };
};

ruta.get('/count/', async (req, res) => {
    try {
        const count = await pohaService.countPoha();
        res.json(count);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.get('/get/', async (req, res) => {
    const pagination = parsePagination(req, res);
    if (pagination === null && (req.query.page !== undefined || req.query.pageSize !== undefined)) {
        return;
    }
    try {
        const response = await pohaService.getAllPoha(pagination);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})


ruta.get('/getindex/:iddolencias/:te/:mate/:terere/:idplanta', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const pageSize = parseInt(req.query.pageSize) || 10;

        const iddolencias = parseInt(req.params.iddolencias) || 0;
        const idplanta = parseInt(req.params.idplanta) || 0;
        const te = parseInt(req.params.te) || 0;
        const mate = parseInt(req.params.mate) || 0;
        const terere = parseInt(req.params.terere) || 0;

        const response = await pohaService.getPohaFilteredPaginated(
            { iddolencias, idplanta, te, mate, terere },
            page,
            pageSize
        );
        res.json(response);
    } catch (error) {
        console.error('Error en getindex:', error);
        res.status(error.statusCode || 500).json({ error: 'Error interno del servidor' });
    }
})

ruta.get('/get/:iddolencias/:te/:mate/:terere/:idplanta', async (req, res) => {
    try {
        const iddolencias = parseInt(req.params.iddolencias) || 0;
        const idplanta = parseInt(req.params.idplanta) || 0;
        const te = parseInt(req.params.te) || 0;
        const mate = parseInt(req.params.mate) || 0;
        const terere = parseInt(req.params.terere) || 0;

        const response = await pohaService.getPohaFiltered({ iddolencias, idplanta, te, mate, terere });
        res.json(response);
    } catch (error) {
        console.error('Error en get con filtros:', error);
        res.status(error.statusCode || 500).json({ error: 'Error interno del servidor' });
    }
})

ruta.get('/get/:idpoha', validateIdPoha, async (req, res) => {
    try {
        const response = await pohaService.getPohaById(req.params.idpoha);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.post('/post/', verifyToken, validateCreatePoha, async (req, res) => {
    try {
        const response = await pohaService.createPoha(req.body, req.user);
        res.json(response);
    } catch (error) {
        console.error('Error al guardar poha con embedding:', error);
        res.status(error.statusCode || 500).json({ error: 'Error interno al guardar poha y generar embedding' });
    }
});

ruta.put('/put/:idpoha', verifyToken, validateUpdatePoha, async (req, res) => {
    try {
        const response = await pohaService.updatePoha(req.params.idpoha, req.body);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.delete('/delete/:idpoha', verifyToken, validateIdPoha, async (req, res) => {
    try {
        const response = await pohaService.deletePoha(req.params.idpoha);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

// ============================================================
// ENDPOINTS DE MODERACION
// ============================================================

// Listar remedios pendientes de aprobacion (solo para admin)
ruta.get('/pendientes', verifyToken, requireAdmin, async (req, res) => {
    try {
        const response = await pohaService.getPendingPoha();
        res.json(response);
    } catch (error) {
        console.error('Error obteniendo remedios pendientes:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// Aprobar remedio pendiente (cambiar estado de PE a AC)
ruta.put('/aprobar/:idpoha', verifyToken, requireAdmin, async (req, res) => {
    try {
        const response = await pohaService.approvePoha(req.params.idpoha);
        res.json(response);
    } catch (error) {
        console.error('Error aprobando remedio:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// Rechazar remedio pendiente (marcar como inactivo)
ruta.put('/rechazar/:idpoha', verifyToken, requireAdmin, async (req, res) => {
    try {
        const response = await pohaService.rejectPoha(req.params.idpoha);
        res.json(response);
    } catch (error) {
        console.error('Error rechazando remedio:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});


module.exports = ruta;
