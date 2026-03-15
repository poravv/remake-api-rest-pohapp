const { body, param } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateCreateUsuario = [
  body('nombre').optional().isString().withMessage('nombre debe ser un string'),
  body('correo').optional().isEmail().withMessage('correo debe ser un email valido'),
  body('idusuario').notEmpty().withMessage('idusuario es requerido'),
  handleValidation,
];

const validateUpdateUsuario = [
  param('idusuario').notEmpty().withMessage('idusuario invalido'),
  handleValidation,
];

const validateIdUsuario = [
  param('idusuario').notEmpty().withMessage('idusuario invalido'),
  handleValidation,
];

const validateEmailParam = [
  param('correo').isEmail().withMessage('correo debe ser un email valido'),
  handleValidation,
];

module.exports = {
  validateCreateUsuario,
  validateUpdateUsuario,
  validateIdUsuario,
  validateEmailParam,
};
