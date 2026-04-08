const admin = require('firebase-admin');

try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    const initOptions = {};

    if (serviceAccountPath) {
        const serviceAccount = require(serviceAccountPath);
        initOptions.credential = admin.credential.cert(serviceAccount);
    } else {
        initOptions.credential = admin.credential.applicationDefault();
    }

    if (projectId) {
        initOptions.projectId = projectId;
    }

    admin.initializeApp(initOptions);
    console.log('Firebase Admin SDK inicializado correctamente');
} catch (error) {
    console.error('Error inicializando Firebase Admin SDK:', error.message);
}

module.exports = admin;
