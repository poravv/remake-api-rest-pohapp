const { body } = require('express-validator');
const { handleValidation } = require('./handleValidation');

const MAX_PREGUNTA_LENGTH = 500;

const INJECTION_MARKERS = [
  'ignore previous instructions',
  'ignore all previous',
  'disregard previous',
  'ignora instrucciones',
  'ignora las instrucciones',
  'ignora las reglas',
  'ignora todas las',
  'olvida las instrucciones',
  'olvida las reglas',
  'olvida todo lo anterior',
  'system:',
  'system prompt',
  '<|im_start|>',
  '<|im_end|>',
  'you are now',
  'eres ahora',
  'actua como si fueras',
  'act as if',
  'developer mode',
  'modo desarrollador',
  'jailbreak',
  // Prompt-extraction attempts
  'muestra tus instrucciones',
  'muestra tu prompt',
  'repite tus instrucciones',
  'repite tu prompt',
  'cuales son tus instrucciones',
  'revela tus instrucciones',
];

/** Strip ASCII control chars (except \n, \t), zero-width, and collapse whitespace. */
function sanitizePregunta(raw) {
  if (typeof raw !== 'string') return raw;
  return raw
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Detect prompt-injection markers case-insensitively; includes the "###" role-delimiter pattern. */
function hasInjectionMarker(text) {
  if (typeof text !== 'string' || !text) return false;
  // Normalizar acentos para que "actúa"/"actua" matcheen el mismo marcador.
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (INJECTION_MARKERS.some((m) => lower.includes(m))) return true;
  // "###" used as a fake role delimiter (multi-line or followed by role word)
  if (/^\s*#{3,}\s*(system|assistant|user)\b/im.test(text)) return true;
  return false;
}

const validateNlpExplica = [
  body('pregunta')
    .isString().withMessage('pregunta debe ser string')
    .bail()
    .customSanitizer(sanitizePregunta)
    .notEmpty().withMessage('pregunta es requerida')
    .isLength({ max: MAX_PREGUNTA_LENGTH })
      .withMessage(`pregunta excede ${MAX_PREGUNTA_LENGTH} caracteres`),
  body('idusuario').notEmpty().withMessage('idusuario es requerido'),
  // Flags injection attempts so downstream services can short-circuit without calling OpenAI.
  (req, _res, next) => {
    req.fueraDeDominio = hasInjectionMarker(req.body?.pregunta);
    next();
  },
  handleValidation,
];

const validateNlpPreview = [
  body('pregunta')
    .isString().withMessage('pregunta debe ser string')
    .bail()
    .customSanitizer(sanitizePregunta)
    .notEmpty().withMessage('pregunta es requerida')
    .isLength({ max: MAX_PREGUNTA_LENGTH })
      .withMessage(`pregunta excede ${MAX_PREGUNTA_LENGTH} caracteres`),
  handleValidation,
];

module.exports = {
  validateNlpExplica,
  validateNlpPreview,
  sanitizePregunta,
  hasInjectionMarker,
  MAX_PREGUNTA_LENGTH,
  INJECTION_MARKERS,
};
