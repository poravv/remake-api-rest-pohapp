/**
 * Setup Admin Script
 *
 * Sets the first admin user via Firebase Custom Claims and database sync.
 * This solves the chicken-and-egg problem: the POST /admin/set-claim endpoint
 * requires an existing admin, but there are none initially.
 *
 * Usage:
 *   node src/scripts/setup-admin.js <firebase-uid>
 *   node src/scripts/setup-admin.js <email>
 *
 * If the argument contains '@', it is treated as an email address.
 * The script will resolve the Firebase UID from the email automatically.
 */

require('dotenv').config();

const admin = require('../firebase');
const usuario = require('../model/usuario');
const sequelize = require('../database');

async function setupAdmin() {
    const input = process.argv[2];

    if (!input) {
        console.error('Uso: node src/scripts/setup-admin.js <firebase-uid | email>');
        console.error('Ejemplos:');
        console.error('  node src/scripts/setup-admin.js abc123xyz');
        console.error('  node src/scripts/setup-admin.js andyvercha@gmail.com');
        process.exit(1);
    }

    try {
        const isEmail = input.includes('@');
        let uid;
        let firebaseUser;

        if (isEmail) {
            // Resolve UID from email
            console.log(`Buscando usuario por email: ${input}`);
            firebaseUser = await admin.auth().getUserByEmail(input);
            uid = firebaseUser.uid;
            console.log(`Usuario encontrado en Firebase: ${firebaseUser.email} (UID: ${uid})`);
        } else {
            // Use input as UID directly
            uid = input;
            firebaseUser = await admin.auth().getUser(uid);
            console.log(`Usuario encontrado en Firebase: ${firebaseUser.email || uid}`);
        }

        // Set custom claims
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        console.log('Custom claims establecidos: { admin: true }');

        // Write to Firestore admins collection (source of truth)
        const db = admin.firestore();
        await db.collection('admins').doc(uid).set({
            email: firebaseUser.email || null,
            isAdmin: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'setup-script',
        });
        console.log('Firestore admins document creado/actualizado.');

        // Sync with database
        await sequelize.authenticate();
        console.log('Conexion a base de datos establecida.');

        // Try finding user by UID first, then by email
        let dbUser = await usuario.findOne({ where: { uid } });
        if (!dbUser && firebaseUser.email) {
            dbUser = await usuario.findOne({ where: { correo: firebaseUser.email } });
        }

        if (dbUser) {
            await dbUser.update({ isAdmin: 1 });
            console.log(`Base de datos actualizada: isAdmin = 1 (correo: ${dbUser.correo}, uid: ${dbUser.uid})`);
        } else {
            console.warn('Usuario no encontrado en la base de datos local. Solo se actualizaron los claims de Firebase.');
        }

        // Verify
        const updatedUser = await admin.auth().getUser(uid);
        const adminDoc = await db.collection('admins').doc(uid).get();
        console.log('\nVerificacion:');
        console.log(`  UID: ${uid}`);
        console.log(`  Email: ${updatedUser.email || 'N/A'}`);
        console.log(`  Claims: ${JSON.stringify(updatedUser.customClaims)}`);
        console.log(`  Firestore admins: ${adminDoc.exists ? JSON.stringify(adminDoc.data()) : 'No encontrado'}`);
        if (dbUser) {
            console.log(`  DB isAdmin: ${dbUser.isAdmin}`);
        }
        console.log('\nAdmin configurado exitosamente.');

        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error(`Error: No se encontro un usuario de Firebase con "${input}"`);
        } else {
            console.error('Error al configurar admin:', error.message);
        }
        process.exit(1);
    }
}

setupAdmin();
