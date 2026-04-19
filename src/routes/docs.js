/**
 * Public API docs router — mounts Swagger UI + raw JSON spec at
 * /api/pohapp/docs. Feature-flagged via ENABLE_SWAGGER_DOCS; when the flag
 * is 'false' (case-insensitive) this module still loads but the parent
 * registry (config_rutas.js) skips the mount entirely.
 *
 * Contract:
 *   GET /          → Swagger UI HTML (branded)
 *   GET /swagger.json → raw OpenAPI 3.0.1 JSON (for tooling / validators)
 */
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('../docs/openapi');

const router = express.Router();

// Structured access log for observability (stdout → fluentbit in k8s).
router.use((req, res, next) => {
    console.log(JSON.stringify({
        event: 'docs_access',
        path: req.path,
        ip: req.ip,
        ua: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
    }));
    next();
});

// Raw spec FIRST so swaggerUi.setup does not intercept it.
router.get('/swagger.json', (req, res) => {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(swaggerSpec));
});

router.use(
    '/',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'Pohã ÑanApp API Docs',
        customCss: '.swagger-ui .topbar { background: #166534; }',
        swaggerOptions: {
            tryItOutEnabled: true,
            persistAuthorization: false,
            displayRequestDuration: true,
            filter: true,
        },
    }),
);

module.exports = router;
