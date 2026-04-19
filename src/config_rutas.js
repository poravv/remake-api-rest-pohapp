const express = require('express');
const routes = express();
const dolencias = require('./routes/ruta_dolencias');
const planta = require('./routes/ruta_planta');
const autor = require('./routes/ruta_autor');
const usuario = require('./routes/ruta_usuario');
const poha = require('./routes/ruta_poha');
const puntos = require('./routes/ruta_puntos');
const dp = require('./routes/ruta_dolencias_poha');
const pp = require('./routes/ruta_poha_planta');
const medicinales = require('./routes/ruta_medicinales');
const queryNLPExplica = require('./routes/queryNLPExplica');
const queryNlpRoute = require('./routes/queryNLP');
const chatHistorial = require('./routes/chatHistorial');
const chatSearch = require('./routes/chatSearch');
const imagenes = require('./routes/ruta_imagenes');
const adminRoutes = require('./routes/ruta_admin');
const adminUsersRoutes = require('./routes/admin/users');
const adminUploadRoutes = require('./routes/admin/upload');
const adminBulkRoutes = require('./routes/admin/bulk');
const adminAuditRoutes = require('./routes/admin/audit');
const adminMetricsRoutes = require('./routes/admin/metrics');
const adminCatalogRoutes = require('./routes/admin/catalog');
const { signMinioUrls } = require('./middleware/signImages');
const { cacheMiddleware } = require('./middleware/cache');
const rateLimit = require('express-rate-limit');

const cacheTtl = parseInt(process.env.CACHE_TTL_SECONDS || '300', 10);

const aiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_AI_MAX || '30', 10),
    standardHeaders: true,
    legacyHeaders: false,
});

try {
    // Aplicar middleware de firma de imágenes globalmente (opcional)
    // routes.use(signMinioUrls);
    
    routes.use('/api/pohapp/dolencias', cacheMiddleware({ ttlSeconds: cacheTtl, prefix: 'dolencias' }), dolencias)
    routes.use('/api/pohapp/planta', cacheMiddleware({ ttlSeconds: cacheTtl, prefix: 'plantas' }), planta)
    routes.use('/api/pohapp/autor',autor)
    routes.use('/api/pohapp/usuario',usuario)
    routes.use('/api/pohapp/poha', cacheMiddleware({ ttlSeconds: cacheTtl, prefix: 'poha' }), signMinioUrls, poha)
    routes.use('/api/pohapp/puntos',puntos)
    routes.use('/api/pohapp/dp',dp)
    routes.use('/api/pohapp/pp',pp)
    routes.use('/api/pohapp/medicinales', cacheMiddleware({ ttlSeconds: cacheTtl, prefix: 'medicinales' }), signMinioUrls, medicinales)
    routes.use(`/api/pohapp/query-nlp/explica`, aiLimiter, signMinioUrls, queryNLPExplica);
    routes.use(`/api/pohapp/query-nlp/preview`, aiLimiter, signMinioUrls, queryNlpRoute);
    routes.use(`/api/pohapp/chat/historial`, chatHistorial);
    routes.use(`/api/pohapp/chat/search`, aiLimiter, chatSearch);
    routes.use('/api/pohapp/imagenes', imagenes);

    // Public API docs (Swagger UI). Feature-flagged so prod can stay off
    // until validated. Default: on in non-prod, off in prod.
    const swaggerEnabled =
        (process.env.ENABLE_SWAGGER_DOCS ??
            (process.env.NODE_ENV === 'production' ? 'false' : 'true'))
            .toLowerCase() === 'true';
    if (swaggerEnabled) {
        routes.use('/api/pohapp/docs', require('./routes/docs'));
    }

    // Admin plane — mount specific sub-routers BEFORE the legacy set-claim
    // router so `/users`, `/upload`, etc. resolve to the new modules.
    routes.use('/api/pohapp/admin/users', adminUsersRoutes);
    routes.use('/api/pohapp/admin/upload', adminUploadRoutes);
    routes.use('/api/pohapp/admin/bulk', adminBulkRoutes);
    routes.use('/api/pohapp/admin/audit-log', adminAuditRoutes);
    routes.use('/api/pohapp/admin/metrics', adminMetricsRoutes);
    routes.use('/api/pohapp/admin/catalog', adminCatalogRoutes);
    routes.use('/api/pohapp/admin', adminRoutes);
} catch (error) {
    console.log(`Algo salió mal ${error}`);
    //res.json({state:"error",message:"ruta incorrecta"});
}

module.exports= routes;
