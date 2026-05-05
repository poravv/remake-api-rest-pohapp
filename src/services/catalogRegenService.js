// Thin wrapper sobre catalogService para mantener el contrato esperado por la ruta admin
const catalogService = require('./catalogService');

/**
 * Rebuild the full Claude catalog and return summary stats.
 * Matches the contract of embeddingRegenService.regenerateAllEmbeddings().
 * @returns {Promise<{total:number, regenerated:number, skipped:number, errors:number}>}
 */
async function regenerateCatalog() {
  return catalogService.rebuildCatalog();
  // rebuildCatalog() ya retorna {total, regenerated, skipped, errors}
}

/**
 * Invalidate the catalog for a specific poha. The next request will trigger a
 * fresh build automatically. Best-effort — does not throw.
 * @param {number|string} idpoha
 * @returns {Promise<{idpoha, invalidated: true}>}
 */
async function invalidateCatalogForPoha(idpoha) {
  // Solo invalida — el próximo request reconstruye automáticamente
  await catalogService.invalidateCatalog();
  return { idpoha, invalidated: true };
}

module.exports = { regenerateCatalog, invalidateCatalogForPoha };
