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

const { parsePagination } = require('../utils/pagination');

/**
 * @swagger
 * /api/pohapp/poha/count:
 *   get:
 *     tags: [Remedios (Pohã)]
 *     summary: Cuenta total de remedios activos
 *     responses:
 *       '200':
 *         description: Contador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
ruta.get('/count/', async (req, res) => {
    try {
        const count = await pohaService.countPoha();
        res.json(count);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

/**
 * @swagger
 * /api/pohapp/poha/get:
 *   get:
 *     tags: [Remedios (Pohã)]
 *     summary: Listar remedios (paginación opcional)
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/PageSizeParam'
 *     responses:
 *       '200':
 *         description: Lista de remedios públicos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/PohaPublic' }
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
        const response = await pohaService.getAllPoha(pagination);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

/**
 * GET /api/pohapp/poha/mias
 * Pohas creadas por el usuario autenticado (poha.idusuario = req.user.uid).
 * Query: estado=AC|PE|IN|all, limit (1..100, default 20), offset.
 * Must be declared BEFORE /get/:idpoha so "mias" no se parsea como id.
 */
ruta.get('/mias', verifyToken, async (req, res) => {
    try {
        const response = await pohaService.listByUser(req.user.uid, {
            estado: req.query.estado,
            limit: req.query.limit,
            offset: req.query.offset,
        });
        res.json(response);
    } catch (error) {
        console.error('Error en /poha/mias:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});


/**
 * @swagger
 * /api/pohapp/poha/getindex/{iddolencias}/{te}/{mate}/{terere}/{idplanta}:
 *   get:
 *     tags: [Remedios (Pohã)]
 *     summary: Buscar remedios por filtros con paginación
 *     parameters:
 *       - name: iddolencias
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *         description: ID de dolencia (0 para ignorar)
 *       - name: te
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *         description: 1 si se desea filtrar por té (0 para ignorar)
 *       - name: mate
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *       - name: terere
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *       - name: idplanta
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *         description: ID de planta (0 para ignorar)
 *       - name: page
 *         in: query
 *         required: false
 *         schema: { type: integer, default: 0 }
 *       - name: pageSize
 *         in: query
 *         required: false
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       '200':
 *         description: Página de resultados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PohaPublic' }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 pageSize: { type: integer }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
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

/**
 * @swagger
 * /api/pohapp/poha/get/{iddolencias}/{te}/{mate}/{terere}/{idplanta}:
 *   get:
 *     tags: [Remedios (Pohã)]
 *     summary: Buscar remedios por filtros sin paginación
 *     parameters:
 *       - name: iddolencias
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *       - name: te
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *       - name: mate
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *       - name: terere
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *       - name: idplanta
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Remedios que matchean los filtros
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/PohaPublic' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
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

/**
 * @swagger
 * /api/pohapp/poha/get/{idpoha}:
 *   get:
 *     tags: [Remedios (Pohã)]
 *     summary: Detalle de remedio por ID
 *     parameters:
 *       - $ref: '#/components/parameters/IdPohaParam'
 *     responses:
 *       '200':
 *         description: Remedio encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PohaPublic' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '429': { $ref: '#/components/responses/RateLimited' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
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
