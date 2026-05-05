const admin = require('firebase-admin');

try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const initOptions = {};

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        // Production: credentials injected via env var (K8s secret / CI).
        // Supports both raw JSON and base64-encoded JSON (GitHub Secrets stores it as base64).
        let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
        if (!jsonStr.startsWith('{')) {
            jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
        }
        const serviceAccount = JSON.parse(jsonStr);
        initOptions.credential = admin.credential.cert(serviceAccount);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        // Development: path to local JSON file
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        initOptions.credential = admin.credential.cert(serviceAccount);
    } else {
        // Fallback: Application Default Credentials (GCP-hosted environments)
        initOptions.credential = admin.credential.applicationDefault();
    }

    if (projectId) {
        initOptions.projectId = projectId;
    }

    admin.initializeApp(initOptions);
    console.log('Firebase Admin SDK inicializado correctamente');
} catch (error) {
    console.error('Error inicializando Firebase Admin SDK:', error.message);
    process.exit(1);
}

module.exports = admin;
