const planta = require('../model/planta');
const database = require('../database');
const { QueryTypes, Op } = require('sequelize');
const { invalidateByPrefix } = require('../middleware/cache');
const { extractObjectName } = require('./minioService');
const contentModeration = require('./contentModerationService');
const embeddingRegen = require('./embeddingRegenService');

// planta.img is varchar(300). Clients that upload via /admin/upload may hand us
// a MinIO presigned URL (~500 chars of X-Amz-* params), which overflows the
// column. Reduce any incoming img value to its canonical object key — same
// shape the Flutter app already sends. No-op for values that are already clean.
function sanitizeImgField(data) {
    if (!data || typeof data !== 'object') return data;
    if (typeof data.img !== 'string' || data.img.length === 0) return data;
    return { ...data, img: extractObjectName(data.img) };
}

async function searchByNombre(nombre) {
    return database.query(
        'select idplanta,nombre,descripcion,estado from planta where upper(nombre) like upper(:nombre)',
        { replacements: { nombre: `%${nombre}%` }, type: QueryTypes.SELECT },
    );
}

async function getPlantasLimited() {
    return database.query('select * from planta limit 100', { type: QueryTypes.SELECT });
}

async function getPlantasUsage() {
    const query = `
        SELECT
            p.idplanta,
            p.nombre,
            p.descripcion,
            p.estado,
            p.img,
            p.nombre_cientifico,
            p.familia,
            p.subfamilia,
            p.habitad_distribucion,
            p.ciclo_vida,
            p.fenologia,
            COUNT(DISTINCT pp.idpoha) AS poha_count
        FROM planta p
        LEFT JOIN poha_planta pp ON pp.idplanta = p.idplanta
        GROUP BY
            p.idplanta,
            p.nombre,
            p.descripcion,
            p.estado,
            p.img,
            p.nombre_cientifico,
            p.familia,
            p.subfamilia,
            p.habitad_distribucion,
            p.ciclo_vida,
            p.fenologia
    `;
    return database.query(query, { type: QueryTypes.SELECT });
}

async function getAllPlantas(pagination) {
    return planta.findAll({
        where: { estado: 'AC' },
        ...(pagination || {}),
    });
}

async function getPlantaById(idplanta) {
    return planta.findByPk(idplanta);
}

async function createPlanta(data, authUser) {
    // Determine estado based on authenticated user role
    let estado = 'PE';
    if (authUser && authUser.isAdmin === 1) {
        estado = 'AC';
    }

    const plantaData = sanitizeImgField({ ...data, estado });
    // Fail-safe: si la moderación no está disponible, la planta se crea como
    // PE (no se auto-activa) en vez de fallar el alta.
    const moderation = await contentModeration.moderateActivationOrDegrade('planta', plantaData);
    if (moderation.degraded) plantaData.estado = 'PE';
    const result = await planta.create(plantaData);
    invalidateByPrefix('plantas');
    invalidateByPrefix('medicinales');
    return result;
}

function asPlain(value) {
    if (!value) return {};
    return typeof value.toJSON === 'function' ? value.toJSON() : value;
}

async function refreshPlantEmbeddings(idplanta) {
    try {
        return await embeddingRegen.regenerateEmbeddingsForPlanta(idplanta);
    } catch (err) {
        console.error(`[plantaService] embedding regen failed for planta ${idplanta}:`, err.message);
        return { status: 'error', error: err.message };
    }
}

async function updatePlanta(idplanta, data, authUser) {
    const current = await planta.findByPk(idplanta);
    const isAdmin = authUser && authUser.isAdmin === 1;
    const sanitized = sanitizeImgField(data);
    let nextState = isAdmin && ['AC', 'PE', 'IN'].includes(sanitized.estado)
        ? sanitized.estado
        : (asPlain(current).estado || 'PE');
    const updateData = { ...sanitized };
    if (current || isAdmin) updateData.estado = nextState;

    // Fail-safe: sin moderación disponible el contenido queda PE en vez de 503.
    const moderation = await contentModeration.moderateActivationOrDegrade('planta', {
        ...asPlain(current),
        ...updateData,
        estado: nextState,
    }, { idplanta });
    if (moderation.degraded) {
        nextState = 'PE';
        updateData.estado = 'PE';
    }

    const result = await planta.update(updateData, { where: { idplanta } });
    invalidateByPrefix('plantas');
    invalidateByPrefix('medicinales');
    if (result[0] > 0 && (nextState === 'AC' || asPlain(current).estado === 'AC')) {
        await refreshPlantEmbeddings(idplanta);
    }
    return result;
}

async function deletePlanta(idplanta) {
    const result = await planta.destroy({ where: { idplanta } });
    invalidateByPrefix('plantas');
    invalidateByPrefix('medicinales');
    return result;
}

async function getPendingPlantas() {
    return planta.findAll({
        where: { estado: 'PE' },
        order: [['idplanta', 'DESC']],
    });
}

async function approvePlanta(idplanta) {
    const current = await planta.findByPk(idplanta);
    if (!current || asPlain(current).estado !== 'PE') {
        const err = new Error('Planta no encontrada o ya aprobada');
        err.statusCode = 404;
        throw err;
    }
    await contentModeration.moderateActivation('planta', {
        ...asPlain(current),
        estado: 'AC',
    }, { idplanta });
    const result = await planta.update(
        { estado: 'AC' },
        { where: { idplanta, estado: 'PE' } },
    );

    if (result[0] === 0) {
        const err = new Error('Planta no encontrada o ya aprobada');
        err.statusCode = 404;
        throw err;
    }

    invalidateByPrefix('plantas');
    invalidateByPrefix('medicinales');
    const embeddingStatus = await refreshPlantEmbeddings(idplanta);
    return { message: 'Planta aprobada exitosamente', affected: result[0], embeddingStatus };
}

async function rejectPlanta(idplanta) {
    const result = await planta.update(
        { estado: 'IN' },
        { where: { idplanta, estado: 'PE' } },
    );

    if (result[0] === 0) {
        const err = new Error('Planta no encontrada o ya procesada');
        err.statusCode = 404;
        throw err;
    }

    invalidateByPrefix('plantas');
    invalidateByPrefix('medicinales');
    return { message: 'Planta rechazada', affected: result[0] };
}

/**
 * "Mis plantas" = plantas that the user has referenced in any of their own
 * pohas. The planta table itself has no idusuario column (plants are a
 * shared catalog); per-user association lives in `poha_planta.idusuario`.
 *
 * Returns { items, total, limit, offset }. `estado` defaults to 'all'
 * because the link is through the user's contribution, not the plant's
 * moderation state — users still want to see plantas they used even if
 * the planta itself is pending.
 */
async function listByUser(uid, filters = {}) {
    if (!uid) {
        const err = new Error('uid requerido');
        err.statusCode = 400;
        throw err;
    }
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);
    const estadoClause =
        filters.estado && filters.estado !== 'all'
            ? 'AND p.estado = :estado'
            : '';
    const qClause = filters.q
        ? 'AND LOWER(p.nombre) LIKE LOWER(:q)'
        : '';

    const countSql = `
        SELECT COUNT(DISTINCT p.idplanta) AS total
          FROM planta p
          JOIN poha_planta pp ON pp.idplanta = p.idplanta
         WHERE pp.idusuario = :uid ${estadoClause} ${qClause}
    `;
    const rowsSql = `
        SELECT DISTINCT p.*
          FROM planta p
          JOIN poha_planta pp ON pp.idplanta = p.idplanta
         WHERE pp.idusuario = :uid ${estadoClause} ${qClause}
         ORDER BY p.idplanta DESC
         LIMIT :limit OFFSET :offset
    `;
    const replacements = { uid, limit, offset };
    if (estadoClause) replacements.estado = filters.estado;
    if (qClause) replacements.q = `%${filters.q}%`;

    const [countRows, rows] = await Promise.all([
        database.query(countSql, { replacements, type: QueryTypes.SELECT }),
        database.query(rowsSql, { replacements, type: QueryTypes.SELECT }),
    ]);
    const total = Number(countRows[0]?.total ?? 0);
    return { items: rows, total, limit, offset };
}

module.exports = {
    searchByNombre,
    getPlantasLimited,
    getPlantasUsage,
    getAllPlantas,
    getPlantaById,
    createPlanta,
    updatePlanta,
    deletePlanta,
    getPendingPlantas,
    approvePlanta,
    rejectPlanta,
    listByUser,
};
