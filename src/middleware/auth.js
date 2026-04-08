const admin = require('../firebase');
const usuario = require('../model/usuario');
const db = admin.firestore();

/**
 * Determines admin status from Firebase token claims or Firestore.
 * Priority: 1) Token custom claims (fast path) 2) Firestore admins collection (source of truth)
 * @param {object} decodedToken - The decoded Firebase ID token
 * @returns {Promise<number>} 1 if admin, 0 otherwise
 */
async function resolveAdminStatus(decodedToken) {
    // Fast path: check token custom claims first (no network call)
    if (decodedToken.admin === true) {
        return 1;
    }

    // Fallback: check Firestore admins collection (source of truth)
    try {
        const adminDoc = await db.collection('admins').doc(decodedToken.uid).get();
        if (adminDoc.exists && adminDoc.data().isAdmin === true) {
            return 1;
        }
    } catch (firestoreError) {
        console.error('Error consultando Firestore para admin status:', firestoreError.message);
        // If Firestore is unreachable, rely on custom claims (already checked above)
    }

    return 0;
}

/**
 * Required authentication middleware.
 * Verifies Firebase ID token and attaches user info to req.user.
 * Admin status is resolved from Firebase Custom Claims or Firestore (source of truth).
 */
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticacion requerido',
            });
        }

        const token = authHeader.split('Bearer ')[1];

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (error) {
            if (error.code === 'auth/id-token-expired') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expirado. Por favor, inicia sesion nuevamente.',
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Token de autenticacion invalido',
            });
        }

        const { uid, email } = decodedToken;

        // Resolve admin status from claims/Firestore (source of truth)
        const isAdmin = await resolveAdminStatus(decodedToken);

        // Look up user in database for user ID (not for admin status)
        const dbUser = await usuario.findOne({ where: { uid } });

        req.user = { uid, email, isAdmin, dbUser };
        next();
    } catch (error) {
        console.error('Error en verifyToken:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno de autenticacion',
        });
    }
}

/**
 * Admin authorization middleware. Must be used AFTER verifyToken.
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.isAdmin !== 1) {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado: se requiere rol de administrador',
        });
    }
    next();
}

/**
 * Optional authentication middleware.
 * If Authorization header is present, verifies token and sets req.user.
 * If no header, continues without blocking.
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split('Bearer ')[1];

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            const { uid, email } = decodedToken;

            // Resolve admin status from claims/Firestore (source of truth)
            const isAdmin = await resolveAdminStatus(decodedToken);

            // Look up user in database for user ID (not for admin status)
            const dbUser = await usuario.findOne({ where: { uid } });

            req.user = { uid, email, isAdmin, dbUser };
        } catch (_error) {
            // Token invalid or expired — continue without user
        }

        next();
    } catch (error) {
        console.error('Error en optionalAuth:', error);
        next();
    }
}

module.exports = { verifyToken, requireAdmin, optionalAuth };
