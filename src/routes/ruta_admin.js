const express = require('express');
const ruta = express.Router();
const admin = require('../firebase');
const usuario = require('../model/usuario');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const rateLimitAdmin = require('../middleware/rateLimitAdmin');
const auditMiddleware = require('../middleware/auditMiddleware');
const db = admin.firestore();

// Protect every route in this legacy admin router with auth + rate-limit.
// Rate limiter runs AFTER verifyToken so keyGenerator keys on req.user.uid.
ruta.use(verifyToken, requireAdmin, rateLimitAdmin);

/**
 * POST /set-claim
 * Sets Firebase Custom Claims for admin role on a target user.
 * Also syncs the isAdmin field in the database.
 * Protected: requires authenticated admin. Audited as `admin.set-claim`.
 */
ruta.post('/set-claim', auditMiddleware('admin.set-claim'), async (req, res) => {
    try {
        const { targetUid, isAdmin: makeAdmin } = req.body;

        if (!targetUid) {
            return res.status(400).json({
                success: false,
                message: 'targetUid es requerido',
            });
        }

        if (typeof makeAdmin !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isAdmin debe ser un valor booleano (true/false)',
            });
        }

        // Safety check: a super-admin cannot remove their own admin status
        if (targetUid === req.user.uid && !makeAdmin) {
            return res.status(400).json({
                success: false,
                message: 'No puedes remover tu propio rol de administrador',
            });
        }

        // Set Firebase Custom Claims
        await admin.auth().setCustomUserClaims(targetUid, { admin: makeAdmin });

        // Get the user info for confirmation and Firestore write
        const firebaseUser = await admin.auth().getUser(targetUid);

        // Write to Firestore admins collection (source of truth)
        if (makeAdmin) {
            await db.collection('admins').doc(targetUid).set({
                email: firebaseUser.email || null,
                isAdmin: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: req.user.uid,
            }, { merge: true });
        } else {
            // Remove admin: delete the document
            await db.collection('admins').doc(targetUid).delete();
        }

        // Sync isAdmin in MySQL database (backward compatibility)
        const dbUser = await usuario.findOne({ where: { uid: targetUid } });
        if (dbUser) {
            await dbUser.update({ isAdmin: makeAdmin ? 1 : 0 });
        }

        res.json({
            success: true,
            message: makeAdmin
                ? `Usuario ${firebaseUser.email || targetUid} ahora es administrador`
                : `Rol de administrador removido para ${firebaseUser.email || targetUid}`,
            data: {
                uid: targetUid,
                email: firebaseUser.email || null,
                isAdmin: makeAdmin,
            },
        });
    } catch (error) {
        console.error('Error en set-claim:', error);

        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({
                success: false,
                message: 'Usuario de Firebase no encontrado',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al establecer custom claims',
            error: error.message,
        });
    }
});

/**
 * GET /check-claim/:uid
 * Reads Firebase Custom Claims for a given user.
 * Protected: requires authenticated admin.
 */
ruta.get('/check-claim/:uid', async (req, res) => {
    try {
        const { uid } = req.params;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'uid es requerido',
            });
        }

        const firebaseUser = await admin.auth().getUser(uid);
        const claims = firebaseUser.customClaims || {};

        // Also check Firestore admin status
        let firestoreAdmin = false;
        try {
            const adminDoc = await db.collection('admins').doc(uid).get();
            firestoreAdmin = adminDoc.exists && adminDoc.data().isAdmin === true;
        } catch (fsError) {
            console.error('Error consultando Firestore para admin status:', fsError.message);
        }

        res.json({
            success: true,
            data: {
                uid,
                email: firebaseUser.email || null,
                isAdmin: claims.admin === true || firestoreAdmin,
                claimAdmin: claims.admin === true,
                firestoreAdmin,
                claims,
            },
        });
    } catch (error) {
        console.error('Error en check-claim:', error);

        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({
                success: false,
                message: 'Usuario de Firebase no encontrado',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al verificar custom claims',
            error: error.message,
        });
    }
});

module.exports = ruta;
