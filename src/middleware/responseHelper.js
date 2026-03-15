/**
 * Unified response helpers.
 *
 * NOTE: The Flutter app currently expects raw data (arrays, objects, integers)
 * directly — NOT wrapped in { success, data }. These helpers are provided for
 * NEW endpoints or for future migration. Existing routes should NOT be migrated
 * to use these until the Flutter client is updated to handle the envelope.
 */

const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

const sendError = (res, message, statusCode = 500, errors = null) => {
  const body = {
    success: false,
    message,
  };
  if (errors) {
    body.errors = errors;
  }
  return res.status(statusCode).json(body);
};

module.exports = { sendSuccess, sendError };
