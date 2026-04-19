const { query } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const ALLOWED_ESTADOS = ['AC', 'PE', 'IN', 'all'];

/**
 * Validates the shared query params for admin catalog list endpoints.
 * estado: 'AC'|'PE'|'IN'|'all' (default 'all')
 * limit: int 1..200 (default 50)
 * offset: int >=0 (default 0)
 * q: optional string, max 120 chars
 */
const validateCatalogList = [
    query('estado')
        .optional()
        .isString()
        .isIn(ALLOWED_ESTADOS)
        .withMessage(`estado debe ser uno de ${ALLOWED_ESTADOS.join(', ')}`),
    query('limit')
        .optional()
        .toInt()
        .isInt({ min: 1, max: 200 })
        .withMessage('limit debe estar entre 1 y 200'),
    query('offset')
        .optional()
        .toInt()
        .isInt({ min: 0 })
        .withMessage('offset debe ser >= 0'),
    query('q')
        .optional()
        .isString()
        .isLength({ max: 120 })
        .withMessage('q debe tener como máximo 120 caracteres'),
    handleValidation,
];

/**
 * Resolves sanitized filter values with defaults.
 * @param {import('express').Request} req
 */
function parseCatalogFilters(req) {
    const estado = req.query.estado ? String(req.query.estado) : 'all';
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
    const offset = req.query.offset !== undefined ? Number(req.query.offset) : 0;
    const q = req.query.q ? String(req.query.q).trim() : '';
    return { estado, limit, offset, q };
}

module.exports = {
    validateCatalogList,
    parseCatalogFilters,
    ALLOWED_ESTADOS,
};
