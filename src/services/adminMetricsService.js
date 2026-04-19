const sequelize = require('../database');
const { QueryTypes } = require('sequelize');
const planta = require('../model/planta');
const poha = require('../model/poha');
const dolencias = require('../model/dolencias');
const firebaseAdminService = require('./firebaseAdminService');

const CACHE_TTL_MS = 60 * 1000;
let cachedAt = 0;
let cachedPayload = null;

async function countByEstado(model, estado) {
    return model.count({ where: { estado } });
}

/**
 * Count Firebase users (paginated walk). Returns both total and disabled count
 * in one pass to avoid scanning twice.
 */
async function countFirebaseUsers() {
    let total = 0;
    let disabled = 0;
    let pageToken;
    // Walk up to ~50k users (500 pages of 100) as a defensive upper bound.
    for (let i = 0; i < 500; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const page = await firebaseAdminService.listUsers(1000, pageToken);
        for (const u of page.users || []) {
            total += 1;
            if (u.disabled) disabled += 1;
        }
        pageToken = page.pageToken;
        if (!pageToken) break;
    }
    return { total, disabled };
}

async function countChatQueries30d() {
    try {
        const [row] = await sequelize.query(
            `SELECT COUNT(*) AS c FROM chat_historial WHERE fecha >= NOW() - INTERVAL 30 DAY`,
            { type: QueryTypes.SELECT }
        );
        return row ? Number(row.c || 0) : 0;
    } catch (_err) {
        return 0;
    }
}

async function computeDashboard() {
    const [firebaseCounts, plantasPending, plantasActive, dolenciasPending, dolenciasActive, pohasPending, pohasActive, chatQueries30d] = await Promise.all([
        countFirebaseUsers().catch(() => ({ total: 0, disabled: 0 })),
        countByEstado(planta, 'PE').catch(() => 0),
        countByEstado(planta, 'AC').catch(() => 0),
        countByEstado(dolencias, 'PE').catch(() => 0),
        countByEstado(dolencias, 'AC').catch(() => 0),
        countByEstado(poha, 'PE').catch(() => 0),
        countByEstado(poha, 'AC').catch(() => 0),
        countChatQueries30d(),
    ]);

    return {
        users_total: firebaseCounts.total,
        users_disabled: firebaseCounts.disabled,
        users_new_30d: null,
        plantas_pending: plantasPending,
        plantas_active: plantasActive,
        dolencias_pending: dolenciasPending,
        dolencias_active: dolenciasActive,
        pohas_pending: pohasPending,
        pohas_active: pohasActive,
        chat_queries_30d: chatQueries30d,
        generated_at: new Date().toISOString(),
        cache_ttl_seconds: Math.floor(CACHE_TTL_MS / 1000),
    };
}

/**
 * Return dashboard KPIs with an in-memory 60 s cache.
 * @param {{force?: boolean}} [opts]
 */
async function getDashboard(opts = {}) {
    const now = Date.now();
    if (!opts.force && cachedPayload && now - cachedAt < CACHE_TTL_MS) {
        return { ...cachedPayload, cached: true };
    }
    const payload = await computeDashboard();
    cachedPayload = payload;
    cachedAt = now;
    return { ...payload, cached: false };
}

function resetCache() {
    cachedPayload = null;
    cachedAt = 0;
}

module.exports = {
    getDashboard,
    resetCache,
    CACHE_TTL_MS,
};
