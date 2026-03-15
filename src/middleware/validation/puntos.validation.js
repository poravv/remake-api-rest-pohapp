const { body, param } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateCreatePuntos = [
  body('idpoha').toInt().isInt({ min: 1 }).withMessage('idpoha es requerido'),
  body('idusuario').notEmpty().withMessage('idusuario es requerido'),
  body('puntos').toInt().isInt().withMessage('puntos debe ser un entero'),
  body('comentario').isString().notEmpty().withMessage('comentario es requerido'),
  handleValidation,
];

const validateUpdatePuntos = [
  param('idpuntos').toInt().isInt({ min: 1 }).withMessage('idpuntos invalido'),
  handleValidation,
];

const validateIdPuntos = [
  param('idpuntos').toInt().isInt({ min: 1 }).withMessage('idpuntos invalido'),
  handleValidation,
];

module.exports = {
  validateCreatePuntos,
  validateUpdatePuntos,
  validateIdPuntos,
};
