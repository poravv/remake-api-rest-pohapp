const { param } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateIdPoha = [
  param('idpoha').toInt().isInt({ min: 1 }).withMessage('idpoha invalido'),
  handleValidation,
];

module.exports = {
  validateIdPoha,
};
