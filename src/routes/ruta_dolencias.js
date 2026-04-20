const express = require('express')
const ruta = express.Router();
const dolenciasService = require('../services/dolenciasService');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const {
    validateCreateDolencias,
    validateUpdateDolencias,
    validateIdDolencias,
    validateModeration,
    validatePendientes,
    validateSearchDescripcion,
} = require('../middleware/validation/dolencias.validation');

const { parsePagination } = require('../utils/pagination');

/**
 * @swagger
 * /api/pohapp/dolencias/getsql/{descripcion}:
 *   get:
 *     tags: [Dolencias]
 *     summary: Buscar dolencias por descripción (LIKE)
 *     parameters:
 *       - name: descripcion
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200':
 *         description: Lista de dolencias coincidentes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/DolenciaPublic' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
ruta.get('/getsql/:descripcion', validateSearchDescripcion, async (req, res) => {
    try {
        const response = await dolenciasService.searchByDescripcion(req.params.descripcion.trim());
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

/**
 * @swagger
 * /api/pohapp/dolencias/usage:
 *   get:
 *     tags: [Dolencias]
 *     summary: Uso (conteo) de dolencias en remedios
 *     responses:
 *       '200':
 *         description: Dolencias con contador de uso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/DolenciaPublic'
 *                   - type: object
 *                     properties:
 *                       uso: { type: integer }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
ruta.get('/usage', async (req, res) => {
    try {
        const response = await dolenciasService.getDolenciasUsage();
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo uso de dolencias' });
    }
});

/**
 * @swagger
 * /api/pohapp/dolencias/get:
 *   get:
 *     tags: [Dolencias]
 *     summary: Listar dolencias (paginación opcional)
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/PageSizeParam'
 *     responses:
 *       '200':
 *         description: Lista de dolencias públicas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/DolenciaPublic' }
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
        const response = await dolenciasService.getAllDolencias(pagination);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

/**
 * GET /api/pohapp/dolencias/mias
 * Dolencias referenciadas por el usuario en sus pohas. Must be declared
 * BEFORE /get/:iddolencias.
 */
ruta.get('/mias', verifyToken, async (req, res) => {
    try {
        const response = await dolenciasService.listByUser(req.user.uid, {
            estado: req.query.estado,
            limit: req.query.limit,
            offset: req.query.offset,
            q: req.query.q,
        });
        res.json(response);
    } catch (error) {
        console.error('Error en /dolencias/mias:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/pohapp/dolencias/get/{iddolencias}:
 *   get:
 *     tags: [Dolencias]
 *     summary: Detalle de dolencia por ID
 *     parameters:
 *       - $ref: '#/components/parameters/IdDolenciasParam'
 *     responses:
 *       '200':
 *         description: Dolencia encontrada (o null si no existe)
 *         content:
 *           application/json:
 *             schema:
 *               nullable: true
 *               allOf:
 *                 - $ref: '#/components/schemas/DolenciaPublic'
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
ruta.get('/get/:iddolencias', validateIdDolencias, async (req, res) => {
    try {
        const response = await dolenciasService.getDolenciasById(req.params.iddolencias);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.post('/post/', verifyToken, validateCreateDolencias, async (req, res) => {
    try {
        const response = await dolenciasService.createDolencias(req.body, req.user);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.put('/put/:iddolencias', verifyToken, validateUpdateDolencias, async (req, res) => {
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

ruta.delete('/delete/:iddolencias', verifyToken, validateIdDolencias, async (req, res) => {
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

ruta.get('/pendientes', verifyToken, requireAdmin, async (req, res) => {
    try {
        const response = await dolenciasService.getPendingDolencias();
        res.json(response);
    } catch (error) {
        console.error('Error obteniendo dolencias pendientes:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

ruta.put('/aprobar/:iddolencias', verifyToken, requireAdmin, async (req, res) => {
    try {
        const response = await dolenciasService.approveDolencias(req.params.iddolencias);
        res.json(response);
    } catch (error) {
        console.error('Error aprobando dolencia:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

ruta.put('/rechazar/:iddolencias', verifyToken, requireAdmin, async (req, res) => {
    try {
        const response = await dolenciasService.rejectDolencias(req.params.iddolencias);
        res.json(response);
    } catch (error) {
        console.error('Error rechazando dolencia:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

module.exports = ruta;
