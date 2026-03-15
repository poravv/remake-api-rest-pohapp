const { body } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateNlpExplica = [
  body('pregunta').isString().notEmpty().withMessage('pregunta es requerida'),
  body('idusuario').notEmpty().withMessage('idusuario es requerido'),
  handleValidation,
];

const validateNlpPreview = [
  body('pregunta').isString().notEmpty().withMessage('pregunta es requerida'),
  handleValidation,
];

module.exports = {
  validateNlpExplica,
  validateNlpPreview,
};
