const { query } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateGetHistorial = [
  query('idusuario').notEmpty().withMessage('idusuario es requerido'),
  handleValidation,
];

module.exports = {
  validateGetHistorial,
};
