const { body, param, query } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateCreatePoha = [
  body('preparado').isString().notEmpty().withMessage('preparado es requerido'),
  body('recomendacion').isString().notEmpty().withMessage('recomendacion es requerida'),
  body('te').optional().toInt().isInt({ min: 0, max: 1 }).withMessage('te debe ser 0 o 1'),
  body('mate').optional().toInt().isInt({ min: 0, max: 1 }).withMessage('mate debe ser 0 o 1'),
  body('terere').optional().toInt().isInt({ min: 0, max: 1 }).withMessage('terere debe ser 0 o 1'),
  body('idautor').optional().toInt().isInt().withMessage('idautor debe ser un entero'),
  body('idusuario').optional().isString().withMessage('idusuario debe ser un string'),
  handleValidation,
];

const validateUpdatePoha = [
  param('idpoha').toInt().isInt({ min: 1 }).withMessage('idpoha invalido'),
  handleValidation,
];

const validateIdPoha = [
  param('idpoha').toInt().isInt({ min: 1 }).withMessage('idpoha invalido'),
  handleValidation,
];

const validateModeration = [
  param('idpoha').toInt().isInt({ min: 1 }).withMessage('idpoha invalido'),
  body('idusuario').notEmpty().withMessage('idusuario requerido'),
  handleValidation,
];

const validatePendientes = [
  query('idusuario').notEmpty().withMessage('idusuario requerido'),
  handleValidation,
];

module.exports = {
  validateCreatePoha,
  validateUpdatePoha,
  validateIdPoha,
  validateModeration,
  validatePendientes,
};
