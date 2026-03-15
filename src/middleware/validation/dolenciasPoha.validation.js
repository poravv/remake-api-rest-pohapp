const { body, param } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateCreateDolenciasPoha = [
  body('idpoha').toInt().isInt({ min: 1 }).withMessage('idpoha es requerido'),
  body('iddolencias').toInt().isInt({ min: 1 }).withMessage('iddolencias es requerido'),
  body('idusuario').notEmpty().withMessage('idusuario es requerido'),
  handleValidation,
];

const validateUpdateDolenciasPoha = [
  param('iddolencias_poha').toInt().isInt({ min: 1 }).withMessage('iddolencias_poha invalido'),
  handleValidation,
];

const validateIdDolenciasPoha = [
  param('iddolencias_poha').toInt().isInt({ min: 1 }).withMessage('iddolencias_poha invalido'),
  handleValidation,
];

const validateDeleteByPoha = [
  param('idpoha').toInt().isInt({ min: 1 }).withMessage('idpoha invalido'),
  param('idusuario').notEmpty().withMessage('idusuario requerido'),
  handleValidation,
];

module.exports = {
  validateCreateDolenciasPoha,
  validateUpdateDolenciasPoha,
  validateIdDolenciasPoha,
  validateDeleteByPoha,
};
