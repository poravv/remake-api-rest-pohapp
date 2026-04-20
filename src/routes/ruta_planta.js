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

const { parsePagination } = require('../utils/pagination');

/**
 * @swagger
 * /api/pohapp/planta/getsql/{nombre}:
 *   get:
 *     tags: [Plantas]
 *     summary: Buscar plantas por nombre (LIKE)
 *     parameters:
 *       - name: nombre
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200':
 *         description: Lista de plantas coincidentes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/PlantaPublic' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
ruta.get('/getsql/:nombre', validateSearchNombre, async (req, res) => {
    try {
        const response = await plantaService.searchByNombre(req.params.nombre.trim());
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

/**
 * @swagger
 * /api/pohapp/planta/getlimit:
 *   get:
 *     tags: [Plantas]
 *     summary: Lista plantas con límite fijo (top-N interno)
 *     responses:
 *       '200':
 *         description: Lista de plantas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/PlantaPublic' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
ruta.get('/getlimit/', async (req, res) => {
    try {
        const response = await plantaService.getPlantasLimited();
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

/**
 * @swagger
 * /api/pohapp/planta/usage:
 *   get:
 *     tags: [Plantas]
 *     summary: Uso (conteo) de plantas en remedios
 *     responses:
 *       '200':
 *         description: Plantas con contador de uso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/PlantaPublic'
 *                   - type: object
 *                     properties:
 *                       uso: { type: integer }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
ruta.get('/usage', async (req, res) => {
    try {
        const response = await plantaService.getPlantasUsage();
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo uso de plantas' });
    }
});

/**
 * @swagger
 * /api/pohapp/planta/get:
 *   get:
 *     tags: [Plantas]
 *     summary: Listar plantas (paginación opcional)
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/PageSizeParam'
 *     responses:
 *       '200':
 *         description: Lista de plantas públicas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/PlantaPublic' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
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

/**
 * GET /api/pohapp/planta/mias
 * Plantas referenciadas por el usuario autenticado en cualquiera de sus pohas.
 * Query: estado=AC|PE|IN|all, limit (1..100, default 20), offset (>=0), q (filtro por nombre).
 * Must be declared BEFORE /get/:idplanta to avoid "mias" being parsed as an id.
 */
ruta.get('/mias', verifyToken, async (req, res) => {
    try {
        const response = await plantaService.listByUser(req.user.uid, {
            estado: req.query.estado,
            limit: req.query.limit,
            offset: req.query.offset,
            q: req.query.q,
        });
        res.json(response);
    } catch (error) {
        console.error('Error en /planta/mias:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/pohapp/planta/get/{idplanta}:
 *   get:
 *     tags: [Plantas]
 *     summary: Detalle de planta por ID
 *     parameters:
 *       - $ref: '#/components/parameters/IdPlantaParam'
 *     responses:
 *       '200':
 *         description: Planta encontrada (o null si no existe)
 *         content:
 *           application/json:
 *             schema:
 *               nullable: true
 *               allOf:
 *                 - $ref: '#/components/schemas/PlantaPublic'
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
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
