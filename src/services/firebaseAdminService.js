const admin = require('../firebase');

/**
 * Fields accepted by updateUser. Anything else is silently dropped so routes
 * cannot accidentally mass-assign privileged attributes from req.body.
 */
const UPDATE_WHITELIST = ['disabled', 'emailVerified', 'displayName', 'photoURL'];

function pickUpdates(updates) {
    const clean = {};
    for (const key of UPDATE_WHITELIST) {
        if (updates && Object.prototype.hasOwnProperty.call(updates, key)) {
            clean[key] = updates[key];
        }
    }
    return clean;
}

/**
 * Paginated Firebase users listing.
 * @param {number} [maxResults=100]
 * @param {string} [pageToken]
 * @returns {Promise<import('firebase-admin').auth.ListUsersResult>}
 */
async function listUsers(maxResults = 100, pageToken) {
    return admin.auth().listUsers(maxResults, pageToken);
}

/**
 * Fetch a Firebase user record by uid.
 */
async function getUser(uid) {
    return admin.auth().getUser(uid);
}

/**
 * Update a Firebase user. Only whitelisted fields are forwarded.
 */
async function updateUser(uid, updates) {
    const clean = pickUpdates(updates);
    return admin.auth().updateUser(uid, clean);
}

/**
 * Permanently delete a Firebase user.
 */
async function deleteUser(uid) {
    return admin.auth().deleteUser(uid);
}

/**
 * Generate a password reset link for the given email.
 * Never send it to any address other than the one stored in Firebase.
 */
async function generatePasswordResetLink(email) {
    return admin.auth().generatePasswordResetLink(email);
}

/**
 * Set custom claims for the given uid. Source of truth for admin role.
 */
async function setCustomUserClaims(uid, claims) {
    return admin.auth().setCustomUserClaims(uid, claims);
}

module.exports = {
    listUsers,
    getUser,
    updateUser,
    deleteUser,
    generatePasswordResetLink,
    setCustomUserClaims,
    UPDATE_WHITELIST,
};
