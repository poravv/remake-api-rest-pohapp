const { body } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const MAX_Q_LENGTH = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/** Verifies the cursor is base64url-decodable JSON with numeric/string `fecha` and integer `id`. */
function isValidCursor(value) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') return false;
    if (typeof parsed.fecha !== 'string' && typeof parsed.fecha !== 'number') return false;
    if (!Number.isInteger(parsed.id)) return false;
    return true;
  } catch (_err) {
    return false;
  }
}

const validateChatSearch = [
  body('idusuario')
    .exists({ checkNull: true, checkFalsy: true })
      .withMessage('idusuario es requerido')
    .bail()
    .custom((v) => typeof v === 'string' || Number.isInteger(v))
      .withMessage('idusuario debe ser string o entero'),

  body('q')
    .optional({ nullable: true })
    .isString().withMessage('q debe ser string')
    .isLength({ max: MAX_Q_LENGTH })
      .withMessage(`q excede ${MAX_Q_LENGTH} caracteres`),

  body('from_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('from_date debe ser ISO-8601'),

  body('to_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('to_date debe ser ISO-8601'),

  body().custom((value) => {
    const { from_date, to_date } = value || {};
    if (from_date && to_date && new Date(from_date) > new Date(to_date)) {
      throw new Error('from_date debe ser <= to_date');
    }
    return true;
  }),

  body('cursor')
    .optional({ nullable: true })
    .custom((v) => isValidCursor(v))
    .withMessage('cursor invalido'),

  body('limit')
    .optional({ nullable: true })
    .isInt({ min: MIN_LIMIT, max: MAX_LIMIT })
      .withMessage(`limit debe ser entero entre ${MIN_LIMIT} y ${MAX_LIMIT}`)
    .toInt(),

  handleValidation,
];

module.exports = {
  validateChatSearch,
  isValidCursor,
  MAX_Q_LENGTH,
  MIN_LIMIT,
  MAX_LIMIT,
  DEFAULT_LIMIT,
};
