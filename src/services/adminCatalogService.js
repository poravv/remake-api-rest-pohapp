const { Op } = require('sequelize');
const planta = require('../model/planta');
const dolencias = require('../model/dolencias');
const poha = require('../model/poha');
const autor = require('../model/autor');
const poha_planta = require('../model/poha_planta');
const dolencias_poha = require('../model/dolencias_poha');

const VALID_ESTADOS = ['AC', 'PE', 'IN'];

/**
 * Builds a Sequelize where clause honoring the admin filters.
 * `estado` of `all` or nullish skips the estado filter (admin sees everything).
 */
function buildWhere({ estado, q, searchField }) {
    const where = {};
    if (estado && estado !== 'all' && VALID_ESTADOS.includes(estado)) {
        where.estado = estado;
    }
    if (q && searchField) {
        where[searchField] = { [Op.like]: `%${q}%` };
    }
    return where;
}

const POHA_INCLUDES = [
    { model: autor },
    { model: poha_planta, include: [{ model: planta }] },
    { model: dolencias_poha, include: [{ model: dolencias }] },
];

/**
 * List plantas for the admin console. Unlike the public endpoint this
 * does NOT filter by estado unless explicitly requested.
 */
async function listPlantas({ estado, limit, offset, q }) {
    const where = buildWhere({ estado, q, searchField: 'nombre' });
    const [total, items] = await Promise.all([
        planta.count({ where }),
        planta.findAll({
            where,
            order: [['idplanta', 'DESC']],
            limit,
            offset,
        }),
    ]);
    return { items, total, limit, offset };
}

/** List dolencias for the admin console (all estados by default). */
async function listDolencias({ estado, limit, offset, q }) {
    const where = buildWhere({ estado, q, searchField: 'descripcion' });
    const [total, items] = await Promise.all([
        dolencias.count({ where }),
        dolencias.findAll({
            where,
            order: [['iddolencias', 'DESC']],
            limit,
            offset,
        }),
    ]);
    return { items, total, limit, offset };
}

/** List pohas (remedios) for the admin console with plantas+dolencias relations. */
async function listPohas({ estado, limit, offset, q }) {
    const where = buildWhere({ estado, q, searchField: 'preparado' });
    // Using `distinct:true` so the count reflects unique poha rows even when
    // the include expands them via joined pivot tables.
    const [total, items] = await Promise.all([
        poha.count({ where, distinct: true, col: 'idpoha' }),
        poha.findAll({
            where,
            include: POHA_INCLUDES,
            order: [['idpoha', 'DESC']],
            limit,
            offset,
            distinct: true,
        }),
    ]);
    return { items, total, limit, offset };
}

module.exports = {
    listPlantas,
    listDolencias,
    listPohas,
};
