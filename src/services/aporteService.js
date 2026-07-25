/**
 * Atomic "aporte" service.
 *
 * Wraps a single transaction that can accept a payload mixing existing
 * plant/dolencia ids with freshly proposed ones. Everything succeeds or
 * rolls back together — no orphan plants/dolencias if the poha insert
 * later fails. This is the shape the Flutter app + web should consume
 * to submit a full remedy in one round-trip.
 */

const planta = require('../model/planta');
const dolencias = require('../model/dolencias');
const poha = require('../model/poha');
const poha_planta = require('../model/poha_planta');
const dolencias_poha = require('../model/dolencias_poha');
const sequelize = require('../database');
const { invalidateByPrefix } = require('../middleware/cache');
const contentModeration = require('./contentModerationService');
const embeddingRegen = require('./embeddingRegenService');

const PLANTA_FIELDS = [
  'nombre',
  'descripcion',
  'img',
  'nombre_cientifico',
  'familia',
  'subfamilia',
  'habitad_distribucion',
  'ciclo_vida',
  'fenologia',
];

function pickPlantaFields(input) {
  const out = {};
  for (const key of PLANTA_FIELDS) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
}

function clientFacingError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Normalized fields for a brand-new planta item, or null when the item
 * references an existing id (number, { id }) or is not an object.
 * Throws on invalid new items.
 */
function newPlantaFields(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id === 'number' && raw.id > 0) return null;
  const fields = pickPlantaFields(raw);
  if (!fields.nombre) {
    throw clientFacingError('Planta nueva sin `nombre`');
  }
  if (!fields.descripcion) {
    fields.descripcion = fields.nombre;
  }
  return fields;
}

function newDolenciaFields(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id === 'number' && raw.id > 0) return null;
  const descripcion = String(raw.descripcion || raw.texto || '').trim();
  if (!descripcion) {
    throw clientFacingError('Dolencia nueva sin `descripcion`');
  }
  return { descripcion };
}

/**
 * Resolves mixed plantas[] payload into a list of idplanta, creating new
 * ones as needed within the transaction. Accepts three shapes per item:
 *  - number                    → existing id, used as-is after assert
 *  - { id: number }            → same as above
 *  - { nombre, descripcion... } → insert with the aporte's estado
 * New items were already moderated before the transaction started.
 */
async function resolvePlantas(items, estado, tx) {
  const ids = [];
  for (const raw of items || []) {
    if (typeof raw === 'number') {
      if (raw > 0) ids.push(raw);
      continue;
    }
    const fields = newPlantaFields(raw);
    if (!fields) {
      if (raw && typeof raw === 'object') ids.push(raw.id);
      continue;
    }
    const created = await planta.create({ ...fields, estado }, { transaction: tx });
    ids.push(created.idplanta);
  }
  return Array.from(new Set(ids));
}

async function resolveDolencias(items, estado, tx) {
  const ids = [];
  for (const raw of items || []) {
    if (typeof raw === 'number') {
      if (raw > 0) ids.push(raw);
      continue;
    }
    const fields = newDolenciaFields(raw);
    if (!fields) {
      if (raw && typeof raw === 'object') ids.push(raw.id);
      continue;
    }
    const created = await dolencias.create({ ...fields, estado }, { transaction: tx });
    ids.push(created.iddolencias);
  }
  return Array.from(new Set(ids));
}

async function assertPlantasExist(ids, tx, activeOnly = false) {
  if (!ids.length) return;
  const { Op } = require('sequelize');
    const found = await planta.findAll({
      attributes: ['idplanta'],
      where: {
        idplanta: { [Op.in]: ids },
        ...(activeOnly ? { estado: 'AC' } : {}),
      },
    transaction: tx,
    raw: true,
  });
  const foundIds = new Set(found.map((r) => r.idplanta));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length) {
    throw clientFacingError(`Plantas no existen: ${missing.join(', ')}`);
  }
}

async function assertDolenciasExist(ids, tx, activeOnly = false) {
  if (!ids.length) return;
  const { Op } = require('sequelize');
    const found = await dolencias.findAll({
      attributes: ['iddolencias'],
      where: {
        iddolencias: { [Op.in]: ids },
        ...(activeOnly ? { estado: 'AC' } : {}),
      },
    transaction: tx,
    raw: true,
  });
  const foundIds = new Set(found.map((r) => r.iddolencias));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length) {
    throw clientFacingError(`Dolencias no existen: ${missing.join(', ')}`);
  }
}

/**
 * Atomic poha aporte. Returns the created poha id plus the resolved
 * plant/dolencia id lists so the client can navigate to the new detail.
 */
async function createAtomicPohaAporte(payload, authUser) {
  const uid = authUser?.uid || null;
  const isAdmin = authUser?.isAdmin === 1;

  if (!payload || typeof payload !== 'object') {
    throw clientFacingError('payload requerido');
  }
  const pohaData = payload.poha || {};
  if (!pohaData.preparado || !pohaData.preparado.trim()) {
    throw clientFacingError('poha.preparado requerido');
  }
  if (!pohaData.recomendacion || !pohaData.recomendacion.trim()) {
    throw clientFacingError('poha.recomendacion requerido');
  }
  const plantasPayload = Array.isArray(payload.plantas) ? payload.plantas : [];
  if (plantasPayload.length === 0) {
    throw clientFacingError('Debe incluir al menos una planta');
  }

  const dolenciasPayload = Array.isArray(payload.dolencias) ? payload.dolencias : [];

  // Toda la moderación ocurre antes de abrir la transacción: una llamada de
  // red nunca debe mantener la transacción abierta. Fail-safe: si la
  // moderación no está disponible, el aporte completo degrada a PE.
  let estado = isAdmin ? 'AC' : 'PE';
  const moderate = async (kind, content) => {
    const moderation = await contentModeration.moderateActivationOrDegrade(kind, { ...content, estado });
    if (moderation.degraded) estado = 'PE';
  };

  await moderate('poha', pohaData);
  for (const raw of plantasPayload) {
    const fields = newPlantaFields(raw);
    if (fields) await moderate('planta', fields);
  }
  for (const raw of dolenciasPayload) {
    const fields = newDolenciaFields(raw);
    if (fields) await moderate('dolencia', fields);
  }

  const result = await sequelize.transaction(async (tx) => {
    const plantaIds = await resolvePlantas(plantasPayload, estado, tx);
    await assertPlantasExist(plantaIds, tx, estado === 'AC');

    const dolenciaIds = await resolveDolencias(dolenciasPayload, estado, tx);
    if (dolenciaIds.length) await assertDolenciasExist(dolenciaIds, tx, estado === 'AC');

    const created = await poha.create(
      {
        preparado: String(pohaData.preparado).trim(),
        recomendacion: String(pohaData.recomendacion).trim(),
        mate: pohaData.mate ? 1 : 0,
        terere: pohaData.terere ? 1 : 0,
        te: pohaData.te ? 1 : 0,
        idusuario: uid || 'system',
        idautor: pohaData.idautor || null,
        estado,
      },
      { transaction: tx },
    );

    if (plantaIds.length) {
      await poha_planta.bulkCreate(
        plantaIds.map((idplanta) => ({
          idpoha: created.idpoha,
          idplanta,
          idusuario: uid || 'system',
        })),
        { transaction: tx },
      );
    }

    if (dolenciaIds.length) {
      await dolencias_poha.bulkCreate(
        dolenciaIds.map((iddolencias) => ({
          idpoha: created.idpoha,
          iddolencias,
          idusuario: uid || 'system',
        })),
        { transaction: tx },
      );
    }

    return {
      idpoha: created.idpoha,
      estado: created.estado,
      plantas: plantaIds,
      dolencias: dolenciaIds,
    };
  });

  invalidateByPrefix('poha');
  invalidateByPrefix('plantas');
  invalidateByPrefix('dolencias');
  invalidateByPrefix('medicinales');

  let embeddingStatus = 'skipped_not_active';
  if (result.estado === 'AC') {
    try {
      embeddingStatus = await embeddingRegen.regenerateEmbeddingForPoha(result.idpoha);
    } catch (err) {
      console.error(`[aporteService] embedding regen failed for ${result.idpoha}:`, err.message);
      embeddingStatus = { status: 'error', error: err.message };
    }
  }
  return { ...result, embeddingStatus };
}

module.exports = {
  createAtomicPohaAporte,
};
