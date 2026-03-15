const { query, body } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateSignedUrl = [
  query('url').isString().notEmpty().withMessage('url es requerida'),
  query('expiry').optional().toInt().isInt({ min: 1 }).withMessage('expiry debe ser un entero positivo'),
  handleValidation,
];

const validateSignedBatch = [
  body('urls').isArray({ min: 1 }).withMessage('urls debe ser un array no vacio'),
  body('expiry').optional().toInt().isInt({ min: 1 }).withMessage('expiry debe ser un entero positivo'),
  handleValidation,
];

const validateInfoUrl = [
  query('url').isString().notEmpty().withMessage('url es requerida'),
  handleValidation,
];

module.exports = {
  validateSignedUrl,
  validateSignedBatch,
  validateInfoUrl,
};
