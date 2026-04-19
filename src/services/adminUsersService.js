const sequelize = require('../database');
const usuario = require('../model/usuario');
const firebaseAdminService = require('./firebaseAdminService');

/**
 * Map a Firebase user record + its MySQL profile into a flat payload consumed
 * by the admin web. The DB profile is optional: users created only in Firebase
 * still appear in the list (profile = null).
 */
function mergeUser(firebaseUser, dbProfile) {
    const meta = firebaseUser.metadata || {};
    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        emailVerified: Boolean(firebaseUser.emailVerified),
        displayName: firebaseUser.displayName || null,
        disabled: Boolean(firebaseUser.disabled),
        photoURL: firebaseUser.photoURL || null,
        lastSignInAt: meta.lastSignInTime || null,
        createdAt: meta.creationTime || null,
        customClaims: firebaseUser.customClaims || {},
        profile: dbProfile
            ? {
                  idusuario: dbProfile.idusuario,
                  nombre: dbProfile.nombre || null,
                  correo: dbProfile.correo || null,
                  photourl: dbProfile.photourl || null,
                  isAdmin: dbProfile.isAdmin || 0,
              }
            : null,
    };
}

/**
 * Lowercased substring filter over email/displayName/uid. Applied client-side
 * after the Firebase page is fetched because Firebase listUsers does not
 * support server-side filtering.
 */
function matchesQuery(firebaseUser, q) {
    if (!q) return true;
    const needle = String(q).trim().toLowerCase();
    if (!needle) return true;
    const haystack = [
        firebaseUser.email,
        firebaseUser.displayName,
        firebaseUser.uid,
    ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
    return haystack.some((v) => v.includes(needle));
}

/**
 * List users merging Firebase + MySQL profile data.
 *
 * @param {object} params
 * @param {number} [params.limit=50]
 * @param {string} [params.cursor]
 * @param {string} [params.q]
 */
async function listUsers({ limit = 50, cursor, q } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const firebaseResult = await firebaseAdminService.listUsers(safeLimit, cursor || undefined);
    const fbUsers = firebaseResult.users || [];

    const uids = fbUsers.map((u) => u.uid);
    const profiles = uids.length
        ? await usuario.findAll({ where: { uid: uids } })
        : [];
    const profileByUid = new Map(profiles.map((p) => [p.uid, p]));

    const items = fbUsers
        .filter((u) => matchesQuery(u, q))
        .map((u) => mergeUser(u, profileByUid.get(u.uid)));

    return {
        users: items,
        next_cursor: firebaseResult.pageToken || null,
    };
}

/**
 * Fetch a single user: Firebase record + MySQL profile (by uid FK).
 */
async function getUserDetail(uid) {
    const fbUser = await firebaseAdminService.getUser(uid);
    const dbUser = await usuario.findOne({ where: { uid } });
    return {
        firebase: fbUser,
        db: dbUser,
        claims: fbUser.customClaims || {},
    };
}

/**
 * Transactional delete: MySQL row first (inside a Sequelize transaction),
 * then Firebase. If Firebase fails, the MySQL transaction is rolled back so
 * both stores remain consistent. If MySQL fails, Firebase is never touched.
 *
 * @param {string} uid
 * @returns {Promise<{uid:string, deleted:true, deletedAt:string, dbRows:number}>}
 */
async function deleteUserTransactional(uid) {
    if (!uid) {
        const err = new Error('uid es requerido');
        err.statusCode = 400;
        throw err;
    }

    const tx = await sequelize.transaction();
    let dbRows = 0;
    try {
        dbRows = await usuario.destroy({ where: { uid }, transaction: tx });

        try {
            await firebaseAdminService.deleteUser(uid);
        } catch (fbErr) {
            await tx.rollback();
            if (fbErr && fbErr.code === 'auth/user-not-found') {
                // MySQL had row(s) but Firebase did not: still roll back to
                // keep behavior predictable. Caller surfaces 404.
                const notFound = new Error('Usuario de Firebase no encontrado');
                notFound.statusCode = 404;
                notFound.code = 'USER_NOT_FOUND';
                throw notFound;
            }
            const partial = new Error('Firebase deleteUser falló, MySQL revertido');
            partial.statusCode = 500;
            partial.code = 'FIREBASE_DELETE_FAILED';
            partial.cause = fbErr;
            throw partial;
        }

        await tx.commit();
        return {
            uid,
            deleted: true,
            deletedAt: new Date().toISOString(),
            dbRows,
        };
    } catch (err) {
        try {
            await tx.rollback();
        } catch (_rollbackErr) {
            // already committed or rolled back
        }
        throw err;
    }
}

module.exports = {
    listUsers,
    getUserDetail,
    deleteUserTransactional,
    mergeUser,
};
