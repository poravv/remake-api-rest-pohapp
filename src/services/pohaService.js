const poha = require('../model/poha');
const dolencias_poha = require('../model/dolencias_poha');
const poha_planta = require('../model/poha_planta');
const autor = require('../model/autor');
const planta = require('../model/planta');
const dolencias = require('../model/dolencias');
const { Op } = require('sequelize');
const { OpenAI } = require('openai');
const sequelize = require('../database');
const { invalidateByPrefix } = require('../middleware/cache');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FULL_INCLUDES = [
    { model: autor },
    {
        model: poha_planta,
        include: [{ model: planta }],
        // Guarantee deterministic plant ordering within every poha response
        // so list cards and detail view render plants in the same sequence.
        order: [['idplanta', 'ASC']],
    },
    { model: dolencias_poha, include: [{ model: dolencias }] },
];

// Fields stored directly on the poha table. Relationship arrays
// (plantas, dolencias) are handled separately via pivot tables.
const POHA_SCALAR_FIELDS = [
    'preparado', 'recomendacion', 'te', 'mate', 'terere', 'idautor', 'idusuario', 'estado',
];

function pickScalarFields(data) {
    const out = {};
    for (const key of POHA_SCALAR_FIELDS) {
        if (data[key] !== undefined) out[key] = data[key];
    }
    return out;
}

function normalizeIdArray(value) {
    if (value === undefined || value === null) return null;
    if (!Array.isArray(value)) return null;
    const ids = value
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v > 0);
    return Array.from(new Set(ids));
}

async function assertPlantasExist(ids, transaction) {
    if (!ids.length) return;
    const found = await planta.findAll({
        attributes: ['idplanta'],
        where: { idplanta: { [Op.in]: ids } },
        transaction,
        raw: true,
    });
    if (found.length !== ids.length) {
        const err = new Error('Una o mas plantas referenciadas no existen');
        err.statusCode = 400;
        throw err;
    }
}

async function assertDolenciasExist(ids, transaction) {
    if (!ids.length) return;
    const found = await dolencias.findAll({
        attributes: ['iddolencias'],
        where: { iddolencias: { [Op.in]: ids } },
        transaction,
        raw: true,
    });
    if (found.length !== ids.length) {
        const err = new Error('Una o mas dolencias referenciadas no existen');
        err.statusCode = 400;
        throw err;
    }
}

async function syncPohaPlantas(idpoha, idusuario, plantasIds, transaction) {
    if (plantasIds === null) return;
    await poha_planta.destroy({ where: { idpoha }, transaction });
    if (!plantasIds.length) return;
    const rows = plantasIds.map((idplanta) => ({
        idpoha,
        idplanta,
        idusuario: idusuario || 'system',
    }));
    await poha_planta.bulkCreate(rows, { transaction });
}

async function syncPohaDolencias(idpoha, idusuario, dolenciasIds, transaction) {
    if (dolenciasIds === null) return;
    await dolencias_poha.destroy({ where: { idpoha }, transaction });
    if (!dolenciasIds.length) return;
    const rows = dolenciasIds.map((iddolencias) => ({
        idpoha,
        iddolencias,
        idusuario: idusuario || 'system',
    }));
    await dolencias_poha.bulkCreate(rows, { transaction });
}

async function countPoha() {
    return poha.count();
}

async function getAllPoha(pagination) {
    return poha.findAll({
        where: { estado: 'AC' },
        ...(pagination || {}),
        include: FULL_INCLUDES,
        distinct: true,
    });
}

async function getPohaById(idpoha) {
    return poha.findByPk(idpoha, { include: FULL_INCLUDES });
}

function buildFilterConditions({ te, mate, terere }) {
    const whereConditions = [{ estado: 'AC' }];
    if (te !== 0) whereConditions.push({ te });
    if (mate !== 0) whereConditions.push({ mate });
    if (terere !== 0) whereConditions.push({ terere });
    return whereConditions;
}

function buildFilterIncludes({ idplanta, iddolencias }) {
    const includesForFilter = [];

    if (idplanta !== 0) {
        includesForFilter.push({
            model: poha_planta,
            required: true,
            attributes: [],
            include: [{
                model: planta,
                required: true,
                attributes: [],
                where: { idplanta },
            }],
        });
    }

    if (iddolencias !== 0) {
        includesForFilter.push({
            model: dolencias_poha,
            required: true,
            attributes: [],
            include: [{
                model: dolencias,
                required: true,
                attributes: [],
                where: { iddolencias },
            }],
        });
    }

    return includesForFilter;
}

async function getPohaFiltered(filters) {
    const whereConditions = buildFilterConditions(filters);
    const includesForFilter = buildFilterIncludes(filters);

    const matchingPohas = await poha.findAll({
        attributes: ['idpoha'],
        include: includesForFilter,
        where: whereConditions.length > 0 ? { [Op.and]: whereConditions } : {},
        raw: true,
    });

    const matchingIds = matchingPohas.map(p => p.idpoha);
    if (matchingIds.length === 0) return [];

    return poha.findAll({
        where: { idpoha: { [Op.in]: matchingIds } },
        include: FULL_INCLUDES,
    });
}

async function getPohaFilteredPaginated(filters, page, pageSize) {
    const whereConditions = buildFilterConditions(filters);
    const includesForFilter = buildFilterIncludes(filters);
    const offset = page * pageSize;

    // Collect matching ids first (required:true joins can return duplicate
    // rows when paginated directly — and Sequelize's subQuery wrapper trips
    // on nested where clauses). Pulling ids, deduping in JS, then slicing
    // keeps the query simple and the result stable. Safe while the total
    // poha count stays modest.
    const matchingPohas = await poha.findAll({
        attributes: ['idpoha'],
        include: includesForFilter,
        where: whereConditions.length > 0 ? { [Op.and]: whereConditions } : {},
        order: [['idpoha', 'ASC']],
        raw: true,
    });

    const uniqueIds = [...new Set(matchingPohas.map(p => p.idpoha))];
    const pageIds = uniqueIds.slice(offset, offset + pageSize);
    if (pageIds.length === 0) return [];

    return poha.findAll({
        where: { idpoha: { [Op.in]: pageIds } },
        include: FULL_INCLUDES,
        order: [['idpoha', 'ASC']],
    });
}

async function createPoha(data, authUser) {
    // Determine estado based on authenticated user role
    let estado = 'PE';
    if (authUser && authUser.isAdmin === 1) {
        estado = 'AC';
    }

    const plantasIds = normalizeIdArray(data.plantas);
    const dolenciasIds = normalizeIdArray(data.dolencias);
    const scalarData = { ...pickScalarFields(data), estado };

    const nuevoPoha = await sequelize.transaction(async (tx) => {
        if (plantasIds !== null) await assertPlantasExist(plantasIds, tx);
        if (dolenciasIds !== null) await assertDolenciasExist(dolenciasIds, tx);

        const created = await poha.create(scalarData, { transaction: tx });
        await syncPohaPlantas(created.idpoha, scalarData.idusuario, plantasIds, tx);
        await syncPohaDolencias(created.idpoha, scalarData.idusuario, dolenciasIds, tx);
        return created;
    });

    // Generate training text from enriched data
    const [datos] = await sequelize.query(`
        SELECT p.idpoha, CONCAT_WS('. ',
            CONCAT('Esta preparacion es util para tratar: ', GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ')),
            CONCAT('Modo de preparacion sugerido: ', MAX(p.preparado)),
            CONCAT('Precauciones: ', IFNULL(MAX(p.recomendacion), 'Ninguna advertencia importante.')),
            CONCAT('Esta mezcla contiene las siguientes plantas: ',
                GROUP_CONCAT(
                    DISTINCT CONCAT(pl.nombre, ' (', pl.nombre_cientifico, ', familia ', pl.familia, ')')
                )
            ),
            CONCAT('Detalles adicionales de cada planta: ',
                GROUP_CONCAT(
                    DISTINCT CONCAT_WS('. ',
                        pl.nombre,
                        pl.descripcion,
                        CONCAT('Habitat: ', pl.habitad_distribucion),
                        CONCAT('Ciclo de vida: ', pl.ciclo_vida)
                    )
                )
            )
        ) AS texto_entrenamiento
        FROM poha p
        LEFT JOIN dolencias_poha dp ON p.idpoha = dp.idpoha
        LEFT JOIN dolencias d ON d.iddolencias = dp.iddolencias
        LEFT JOIN poha_planta pp ON p.idpoha = pp.idpoha
        LEFT JOIN planta pl ON pl.idplanta = pp.idplanta
        WHERE p.idpoha = ?
        GROUP BY p.idpoha
    `, { replacements: [nuevoPoha.idpoha] });

    const textoEntrenamiento = datos[0]?.texto_entrenamiento;
    const pohaWithRelations = await getPohaById(nuevoPoha.idpoha);

    invalidateByPrefix('poha');
    invalidateByPrefix('medicinales');

    if (!textoEntrenamiento) {
        return {
            poha: pohaWithRelations ? pohaWithRelations.toJSON() : nuevoPoha.toJSON(),
            embeddingGuardado: false,
            error: 'No se pudo generar texto de entrenamiento.',
        };
    }

    // Create embedding
    const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textoEntrenamiento,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Save to medicina_embeddings
    await sequelize.query(`
        INSERT INTO medicina_embeddings (idpoha, resumen, embedding)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE resumen = VALUES(resumen), embedding = VALUES(embedding)
    `, {
        replacements: [nuevoPoha.idpoha, textoEntrenamiento, JSON.stringify(embedding)],
    });

    return {
        ...(pohaWithRelations ? pohaWithRelations.toJSON() : nuevoPoha.toJSON()),
        embeddingGuardado: true,
    };
}

async function updatePoha(idpoha, data) {
    const plantasIds = normalizeIdArray(data.plantas);
    const dolenciasIds = normalizeIdArray(data.dolencias);
    const scalarData = pickScalarFields(data);

    await sequelize.transaction(async (tx) => {
        if (plantasIds !== null) await assertPlantasExist(plantasIds, tx);
        if (dolenciasIds !== null) await assertDolenciasExist(dolenciasIds, tx);

        if (Object.keys(scalarData).length > 0) {
            await poha.update(scalarData, { where: { idpoha }, transaction: tx });
        }
        await syncPohaPlantas(idpoha, scalarData.idusuario, plantasIds, tx);
        await syncPohaDolencias(idpoha, scalarData.idusuario, dolenciasIds, tx);
    });

    invalidateByPrefix('poha');
    invalidateByPrefix('medicinales');

    const updated = await getPohaById(idpoha);
    return updated ? updated.toJSON() : null;
}

async function deletePoha(idpoha) {
    await poha_planta.destroy({ where: { idpoha } });
    await dolencias_poha.destroy({ where: { idpoha } });
    const result = await poha.destroy({ where: { idpoha } });
    invalidateByPrefix('poha');
    invalidateByPrefix('medicinales');
    return result;
}

async function getPendingPoha() {
    return poha.findAll({
        where: { estado: 'PE' },
        include: FULL_INCLUDES,
        order: [['idpoha', 'DESC']],
    });
}

/**
 * Returns pohas contributed by a specific user (poha.idusuario = uid).
 * Filters: estado ('AC'|'PE'|'IN'|'all'|undefined), limit 1..100, offset >=0.
 * Returns { items, total } so the caller can paginate without a second round trip.
 */
async function listByUser(uid, filters = {}) {
    if (!uid) {
        const err = new Error('uid requerido');
        err.statusCode = 400;
        throw err;
    }
    const where = { idusuario: uid };
    if (filters.estado && filters.estado !== 'all') {
        where.estado = filters.estado;
    }
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);
    const { count, rows } = await poha.findAndCountAll({
        where,
        include: FULL_INCLUDES,
        order: [['idpoha', 'DESC']],
        distinct: true,
        col: 'idpoha',
        limit,
        offset,
    });
    return { items: rows, total: count, limit, offset };
}

async function approvePoha(idpoha) {
    const result = await poha.update(
        { estado: 'AC' },
        { where: { idpoha, estado: 'PE' } },
    );

    if (result[0] === 0) {
        const err = new Error('Remedio no encontrado o ya aprobado');
        err.statusCode = 404;
        throw err;
    }

    invalidateByPrefix('poha');
    invalidateByPrefix('medicinales');
    return { message: 'Remedio aprobado exitosamente', affected: result[0] };
}

async function rejectPoha(idpoha) {
    const result = await poha.update(
        { estado: 'IN' },
        { where: { idpoha, estado: 'PE' } },
    );

    if (result[0] === 0) {
        const err = new Error('Remedio no encontrado o ya procesado');
        err.statusCode = 404;
        throw err;
    }

    invalidateByPrefix('poha');
    invalidateByPrefix('medicinales');
    return { message: 'Remedio rechazado', affected: result[0] };
}

module.exports = {
    countPoha,
    getAllPoha,
    getPohaById,
    getPohaFiltered,
    getPohaFilteredPaginated,
    createPoha,
    updatePoha,
    deletePoha,
    getPendingPoha,
    approvePoha,
    rejectPoha,
    listByUser,
};
