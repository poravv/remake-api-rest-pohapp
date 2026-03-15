const { body, param, query } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const validateCreatePlanta = [
  body('nombre').isString().notEmpty().withMessage('nombre es requerido'),
  body('descripcion').isString().notEmpty().withMessage('descripcion es requerida'),
  body('estado').optional().isString(),
  body('img').optional().isString(),
  body('nombre_cientifico').optional().isString(),
  body('familia').optional().isString(),
  body('subfamilia').optional().isString(),
  body('habitad_distribucion').optional().isString(),
  body('ciclo_vida').optional().isString(),
  body('fenologia').optional().isString(),
  body('idusuario').optional().isString(),
  handleValidation,
];

const validateUpdatePlanta = [
  param('idplanta').toInt().isInt({ min: 1 }).withMessage('idplanta invalido'),
  handleValidation,
];

const validateIdPlanta = [
  param('idplanta').toInt().isInt({ min: 1 }).withMessage('idplanta invalido'),
  handleValidation,
];

const validateModeration = [
  param('idplanta').toInt().isInt({ min: 1 }).withMessage('idplanta invalido'),
  body('idusuario').notEmpty().withMessage('idusuario requerido'),
  handleValidation,
];

const validatePendientes = [
  query('idusuario').notEmpty().withMessage('idusuario requerido'),
  handleValidation,
];

const validateSearchNombre = [
  param('nombre').isString().notEmpty().withMessage('nombre es requerido'),
  handleValidation,
];

module.exports = {
  validateCreatePlanta,
  validateUpdatePlanta,
  validateIdPlanta,
  validateModeration,
  validatePendientes,
  validateSearchNombre,
};
