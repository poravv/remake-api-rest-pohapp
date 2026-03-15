const dolencias = require('../model/dolencias');
const usuario = require('../model/usuario');
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

async function createDolencias(data) {
    const { idusuario } = data;

    // Determine estado based on user role
    let estado = 'PE';
    if (idusuario) {
        const user = await usuario.findByPk(idusuario);
        if (user && user.isAdmin === 1) {
            estado = 'AC';
        }
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

async function checkAdmin(idusuario) {
    const user = await usuario.findByPk(idusuario);
    return user && user.isAdmin === 1;
}

async function getPendingDolencias(idusuario) {
    if (!await checkAdmin(idusuario)) {
        const err = new Error('Acceso denegado');
        err.statusCode = 403;
        throw err;
    }

    return dolencias.findAll({
        where: { estado: 'PE' },
        order: [['iddolencias', 'DESC']],
    });
}

async function approveDolencias(iddolencias, idusuario) {
    if (!await checkAdmin(idusuario)) {
        const err = new Error('Acceso denegado');
        err.statusCode = 403;
        throw err;
    }

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

async function rejectDolencias(iddolencias, idusuario) {
    if (!await checkAdmin(idusuario)) {
        const err = new Error('Acceso denegado');
        err.statusCode = 403;
        throw err;
    }

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
};
