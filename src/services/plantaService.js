const planta = require('../model/planta');
const database = require('../database');
const { QueryTypes, Op } = require('sequelize');
const { invalidateByPrefix } = require('../middleware/cache');

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

    const plantaData = { ...data, estado };
    const result = await planta.create(plantaData);
    invalidateByPrefix('plantas');
    invalidateByPrefix('medicinales');
    return result;
}

async function updatePlanta(idplanta, data) {
    const result = await planta.update(data, { where: { idplanta } });
    invalidateByPrefix('plantas');
    invalidateByPrefix('medicinales');
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
    return { message: 'Planta aprobada exitosamente', affected: result[0] };
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
