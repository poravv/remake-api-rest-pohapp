/**
 * Shared pagination parser used by the public catalog routes.
 * Replaces four identical copies in ruta_planta / ruta_dolencias /
 * ruta_medicinales / ruta_poha.
 *
 * - Returns null when the caller omits both `page` and `pageSize` so
 *   the route can fall back to a non-paginated query.
 * - Writes a 400 to `res` (and returns null) for invalid input.
 * - Clamps `pageSize` to `maxPageSize` (default 100) to cap response
 *   size and protect the DB from accidental huge queries.
 */
function parsePagination(req, res, opts = {}) {
  const maxPageSize = Number.isInteger(opts.maxPageSize) && opts.maxPageSize > 0
    ? opts.maxPageSize
    : 100;
  const defaultPageSize = Number.isInteger(opts.defaultPageSize) && opts.defaultPageSize > 0
    ? Math.min(opts.defaultPageSize, maxPageSize)
    : 20;

  const hasPage = req.query.page !== undefined;
  const hasPageSize = req.query.pageSize !== undefined;
  if (!hasPage && !hasPageSize) return null;

  const page = hasPage ? parseInt(req.query.page, 10) : 0;
  const rawPageSize = hasPageSize ? parseInt(req.query.pageSize, 10) : defaultPageSize;

  if (Number.isNaN(page) || Number.isNaN(rawPageSize) || page < 0 || rawPageSize <= 0) {
    res.status(400).json({ error: 'paginacion invalida' });
    return null;
  }

  const pageSize = Math.min(rawPageSize, maxPageSize);

  return {
    limit: pageSize,
    offset: page * pageSize,
    page,
    pageSize,
  };
}

module.exports = { parsePagination };
