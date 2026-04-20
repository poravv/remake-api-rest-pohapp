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
 * Resolves mixed plantas[] payload into a list of idplanta, creating new
 * ones as needed within the transaction. Accepts three shapes per item:
 *  - number                    → existing id, used as-is after assert
 *  - { id: number }            → same as above
 *  - { nombre, descripcion... } → insert with estado='PE'
 */
async function resolvePlantas(items, userId, isAdmin, tx) {
  const ids = [];
  for (const raw of items || []) {
    if (raw === null || raw === undefined) continue;
    if (typeof raw === 'number') {
      if (raw > 0) ids.push(raw);
      continue;
    }
    if (typeof raw === 'object') {
      if (typeof raw.id === 'number' && raw.id > 0) {
        ids.push(raw.id);
        continue;
      }
      const fields = pickPlantaFields(raw);
      if (!fields.nombre) {
        throw clientFacingError('Planta nueva sin `nombre`');
      }
      if (!fields.descripcion) {
        fields.descripcion = fields.nombre;
      }
      const created = await planta.create(
        {
          ...fields,
          estado: isAdmin ? 'AC' : 'PE',
        },
        { transaction: tx },
      );
      ids.push(created.idplanta);
    }
  }
  return Array.from(new Set(ids));
}

async function resolveDolencias(items, userId, isAdmin, tx) {
  const ids = [];
  for (const raw of items || []) {
    if (raw === null || raw === undefined) continue;
    if (typeof raw === 'number') {
      if (raw > 0) ids.push(raw);
      continue;
    }
    if (typeof raw === 'object') {
      if (typeof raw.id === 'number' && raw.id > 0) {
        ids.push(raw.id);
        continue;
      }
      const descripcion = String(raw.descripcion || raw.texto || '').trim();
      if (!descripcion) {
        throw clientFacingError('Dolencia nueva sin `descripcion`');
      }
      const created = await dolencias.create(
        {
          descripcion,
          estado: isAdmin ? 'AC' : 'PE',
        },
        { transaction: tx },
      );
      ids.push(created.iddolencias);
    }
  }
  return Array.from(new Set(ids));
}

async function assertPlantasExist(ids, tx) {
  if (!ids.length) return;
  const { Op } = require('sequelize');
  const found = await planta.findAll({
    attributes: ['idplanta'],
    where: { idplanta: { [Op.in]: ids } },
    transaction: tx,
    raw: true,
  });
  const foundIds = new Set(found.map((r) => r.idplanta));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length) {
    throw clientFacingError(`Plantas no existen: ${missing.join(', ')}`);
  }
}

async function assertDolenciasExist(ids, tx) {
  if (!ids.length) return;
  const { Op } = require('sequelize');
  const found = await dolencias.findAll({
    attributes: ['iddolencias'],
    where: { iddolencias: { [Op.in]: ids } },
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

  const result = await sequelize.transaction(async (tx) => {
    const plantaIds = await resolvePlantas(plantasPayload, uid, isAdmin, tx);
    await assertPlantasExist(plantaIds, tx);

    const dolenciaIds = await resolveDolencias(dolenciasPayload, uid, isAdmin, tx);
    if (dolenciaIds.length) await assertDolenciasExist(dolenciaIds, tx);

    const created = await poha.create(
      {
        preparado: String(pohaData.preparado).trim(),
        recomendacion: String(pohaData.recomendacion).trim(),
        mate: pohaData.mate ? 1 : 0,
        terere: pohaData.terere ? 1 : 0,
        te: pohaData.te ? 1 : 0,
        idusuario: uid || 'system',
        idautor: pohaData.idautor || null,
        estado: isAdmin ? 'AC' : 'PE',
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
  return result;
}

module.exports = {
  createAtomicPohaAporte,
};
