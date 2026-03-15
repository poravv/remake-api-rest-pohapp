const poha = require('../model/poha');
const dolencias_poha = require('../model/dolencias_poha');
const poha_planta = require('../model/poha_planta');
const autor = require('../model/autor');
const planta = require('../model/planta');
const dolencias = require('../model/dolencias');
const usuario = require('../model/usuario');
const { Op } = require('sequelize');
const { OpenAI } = require('openai');
const sequelize = require('../database');
const { invalidateByPrefix } = require('../middleware/cache');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FULL_INCLUDES = [
    { model: autor },
    { model: poha_planta, include: [{ model: planta }] },
    { model: dolencias_poha, include: [{ model: dolencias }] },
];

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

    const matchingPohas = await poha.findAll({
        attributes: ['idpoha'],
        include: includesForFilter,
        where: whereConditions.length > 0 ? { [Op.and]: whereConditions } : {},
        limit: pageSize,
        offset,
        raw: true,
    });

    const matchingIds = matchingPohas.map(p => p.idpoha);
    if (matchingIds.length === 0) return [];

    return poha.findAll({
        where: { idpoha: { [Op.in]: matchingIds } },
        include: FULL_INCLUDES,
    });
}

async function createPoha(data) {
    // Determine estado based on user role
    let estado = 'PE';
    const { idusuario } = data;
    if (idusuario) {
        const user = await usuario.findByPk(idusuario);
        if (user && user.isAdmin === 1) {
            estado = 'AC';
        }
    }

    const pohaData = { ...data, estado };
    const nuevoPoha = await poha.create(pohaData);

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

    if (!textoEntrenamiento) {
        return { poha: nuevoPoha.toJSON(), embeddingGuardado: false, error: 'No se pudo generar texto de entrenamiento.' };
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

    invalidateByPrefix('poha');
    invalidateByPrefix('medicinales');

    return { ...nuevoPoha.toJSON(), embeddingGuardado: true };
}

async function updatePoha(idpoha, data) {
    const result = await poha.update(data, { where: { idpoha } });
    invalidateByPrefix('poha');
    invalidateByPrefix('medicinales');
    return result;
}

async function deletePoha(idpoha) {
    await poha_planta.destroy({ where: { idpoha } });
    await dolencias_poha.destroy({ where: { idpoha } });
    const result = await poha.destroy({ where: { idpoha } });
    invalidateByPrefix('poha');
    invalidateByPrefix('medicinales');
    return result;
}

async function checkAdmin(idusuario) {
    const user = await usuario.findByPk(idusuario);
    return user && user.isAdmin === 1;
}

async function getPendingPoha(idusuario) {
    if (!await checkAdmin(idusuario)) {
        const err = new Error('Acceso denegado: se requiere rol de administrador');
        err.statusCode = 403;
        throw err;
    }

    return poha.findAll({
        where: { estado: 'PE' },
        include: FULL_INCLUDES,
        order: [['idpoha', 'DESC']],
    });
}

async function approvePoha(idpoha, idusuario) {
    if (!await checkAdmin(idusuario)) {
        const err = new Error('Acceso denegado: se requiere rol de administrador');
        err.statusCode = 403;
        throw err;
    }

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

async function rejectPoha(idpoha, idusuario) {
    if (!await checkAdmin(idusuario)) {
        const err = new Error('Acceso denegado: se requiere rol de administrador');
        err.statusCode = 403;
        throw err;
    }

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
};
