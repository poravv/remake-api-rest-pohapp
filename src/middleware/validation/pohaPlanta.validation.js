const { body, param } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateCreatePohaPlanta = [
  body('idpoha').toInt().isInt({ min: 1 }).withMessage('idpoha es requerido'),
  body('idplanta').toInt().isInt({ min: 1 }).withMessage('idplanta es requerido'),
  body('idusuario').notEmpty().withMessage('idusuario es requerido'),
  handleValidation,
];

const validateUpdatePohaPlanta = [
  param('idpoha_planta').toInt().isInt({ min: 1 }).withMessage('idpoha_planta invalido'),
  handleValidation,
];

const validateIdPohaPlanta = [
  param('idpoha_planta').toInt().isInt({ min: 1 }).withMessage('idpoha_planta invalido'),
  handleValidation,
];

const validateDeleteByPoha = [
  param('idpoha').toInt().isInt({ min: 1 }).withMessage('idpoha invalido'),
  param('idusuario').notEmpty().withMessage('idusuario requerido'),
  handleValidation,
];

module.exports = {
  validateCreatePohaPlanta,
  validateUpdatePohaPlanta,
  validateIdPohaPlanta,
  validateDeleteByPoha,
};
