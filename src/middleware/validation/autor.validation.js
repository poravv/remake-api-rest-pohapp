const { body, param } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateCreateAutor = [
  body('nombre').isString().notEmpty().withMessage('nombre es requerido'),
  body('apellido').isString().notEmpty().withMessage('apellido es requerido'),
  body('nacimiento').notEmpty().withMessage('nacimiento es requerido'),
  body('ciudad').isString().notEmpty().withMessage('ciudad es requerida'),
  body('pais').isString().notEmpty().withMessage('pais es requerido'),
  handleValidation,
];

const validateUpdateAutor = [
  param('idautor').toInt().isInt({ min: 1 }).withMessage('idautor invalido'),
  handleValidation,
];

const validateIdAutor = [
  param('idautor').toInt().isInt({ min: 1 }).withMessage('idautor invalido'),
  handleValidation,
];

module.exports = {
  validateCreateAutor,
  validateUpdateAutor,
  validateIdAutor,
};
