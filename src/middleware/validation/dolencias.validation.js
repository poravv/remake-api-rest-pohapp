const { body, param, query } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateCreateDolencias = [
  body('descripcion').isString().notEmpty().withMessage('descripcion es requerida'),
  body('estado').optional().isString(),
  body('idusuario').optional().isString(),
  handleValidation,
];

const validateUpdateDolencias = [
  param('iddolencias').toInt().isInt({ min: 1 }).withMessage('iddolencias invalido'),
  handleValidation,
];

const validateIdDolencias = [
  param('iddolencias').toInt().isInt({ min: 1 }).withMessage('iddolencias invalido'),
  handleValidation,
];

const validateModeration = [
  param('iddolencias').toInt().isInt({ min: 1 }).withMessage('iddolencias invalido'),
  body('idusuario').notEmpty().withMessage('idusuario requerido'),
  handleValidation,
];

const validatePendientes = [
  query('idusuario').notEmpty().withMessage('idusuario requerido'),
  handleValidation,
];

const validateSearchDescripcion = [
  param('descripcion').isString().notEmpty().withMessage('descripcion es requerida'),
  handleValidation,
];

module.exports = {
  validateCreateDolencias,
  validateUpdateDolencias,
  validateIdDolencias,
  validateModeration,
  validatePendientes,
  validateSearchDescripcion,
};
