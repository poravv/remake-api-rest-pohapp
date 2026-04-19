const dolencias = require('../model/dolencias');
const database = require('../database');
const { QueryTypes } = require('sequelize');
const { invalidateByPrefix } = require('../middleware/cache');

async function searchByDescripcion(descripcion) {
    return database.query(
        'select * from dolencias where upper(descripcion) like upper(:descripcion)',
        { replacements: { descripcion: `%${descripcion}%` }, type: QueryTypes.SELECT },
    );
}

async function getDolenciasUsage() {
    const query = `
        SELECT
            d.iddolencias,
            d.descripcion,
            d.estado,
            COUNT(DISTINCT dp.idpoha) AS poha_count
        FROM dolencias d
        LEFT JOIN dolencias_poha dp ON dp.iddolencias = d.iddolencias
        GROUP BY d.iddolencias, d.descripcion, d.estado
    `;
    return database.query(query, { type: QueryTypes.SELECT });
}

async function getAllDolencias(pagination) {
    return dolencias.findAll({
        where: { estado: 'AC' },
        ...(pagination || {}),
    });
}

async function getDolenciasById(iddolencias) {
    return dolencias.findByPk(iddolencias);
}

async function createDolencias(data, authUser) {
    // Determine estado based on authenticated user role
    let estado = 'PE';
    if (authUser && authUser.isAdmin === 1) {
        estado = 'AC';
    }

    const dolenciaData = { ...data, estado };
    const result = await dolencias.create(dolenciaData);
    invalidateByPrefix('dolencias');
    invalidateByPrefix('medicinales');
    return result;
}

async function updateDolencias(iddolencias, data) {
    const result = await dolencias.update(data, { where: { iddolencias } });
    invalidateByPrefix('dolencias');
    invalidateByPrefix('medicinales');
    return result;
}

async function deleteDolencias(iddolencias) {
    const result = await dolencias.destroy({ where: { iddolencias } });
    invalidateByPrefix('dolencias');
    invalidateByPrefix('medicinales');
    return result;
}

async function getPendingDolencias() {
    return dolencias.findAll({
        where: { estado: 'PE' },
        order: [['iddolencias', 'DESC']],
    });
}

async function approveDolencias(iddolencias) {
    const [updated] = await dolencias.update(
        { estado: 'AC' },
        { where: { iddolencias, estado: 'PE' } },
    );

    if (updated === 0) {
        const err = new Error('Dolencia no encontrada o ya procesada');
        err.statusCode = 404;
        throw err;
    }

    invalidateByPrefix('dolencias');
    invalidateByPrefix('medicinales');
    return { message: 'Dolencia aprobada', iddolencias };
}

async function rejectDolencias(iddolencias) {
    const [updated] = await dolencias.update(
        { estado: 'IN' },
        { where: { iddolencias, estado: 'PE' } },
    );

    if (updated === 0) {
        const err = new Error('Dolencia no encontrada o ya procesada');
        err.statusCode = 404;
        throw err;
    }

    invalidateByPrefix('dolencias');
    return { message: 'Dolencia rechazada', iddolencias };
}

/**
 * "Mis dolencias" = dolencias referenced by the user in any of their pohas.
 * dolencias has no idusuario column; per-user link lives in
 * `dolencias_poha.idusuario`. Returns { items, total, limit, offset }.
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
            ? 'AND d.estado = :estado'
            : '';
    const qClause = filters.q
        ? 'AND LOWER(d.descripcion) LIKE LOWER(:q)'
        : '';

    const countSql = `
        SELECT COUNT(DISTINCT d.iddolencias) AS total
          FROM dolencias d
          JOIN dolencias_poha dp ON dp.iddolencias = d.iddolencias
         WHERE dp.idusuario = :uid ${estadoClause} ${qClause}
    `;
    const rowsSql = `
        SELECT DISTINCT d.*
          FROM dolencias d
          JOIN dolencias_poha dp ON dp.iddolencias = d.iddolencias
         WHERE dp.idusuario = :uid ${estadoClause} ${qClause}
         ORDER BY d.iddolencias DESC
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
    searchByDescripcion,
    getDolenciasUsage,
    getAllDolencias,
    getDolenciasById,
    createDolencias,
    updateDolencias,
    deleteDolencias,
    getPendingDolencias,
    approveDolencias,
    rejectDolencias,
    listByUser,
};
