/**
 * OpenAPI 3.0.1 configuration for the Pohã ÑanApp Public API.
 *
 * Documents ONLY public read endpoints (23 total across 7 routers).
 * Admin, user, autor, puntos, and auth-protected routes are intentionally
 * excluded via an EXPLICIT apis list (no glob) — adding a `@swagger` block
 * to an excluded router will NOT surface it here.
 *
 * Public schemas (PlantaPublic, DolenciaPublic, PohaPublic) omit internal
 * audit fields (idusuario, idautor, estado) to avoid leaking implementation
 * details to external consumers.
 */
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.1',
        info: {
            title: 'Pohã ÑanApp Public API',
            version: '1.0.0',
            description:
                'API pública de lectura del acervo de plantas medicinales paraguayas (pohã ñana). ' +
                'Diseñada para consumo por developers, ONGs educativas, tesistas y medios que deseen ' +
                'integrarse con el catálogo sin requerir credenciales. Todas las rutas documentadas aquí ' +
                'son endpoints de lectura sin autenticación, sujetas a rate-limit ' +
                '(120 req/min general, 30 req/min para endpoints de IA).',
            contact: { name: 'Pohã ÑanApp Ops', email: 'ops@pohapp.com' },
            license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
        },
        servers: [
            { url: 'https://back.mindtechpy.net/pohapp', description: 'Production' },
        ],
        tags: [
            { name: 'Plantas', description: 'Catálogo de plantas medicinales' },
            { name: 'Dolencias', description: 'Dolencias tratadas por pohã ñana' },
            { name: 'Remedios (Pohã)', description: 'Recetas y preparaciones tradicionales' },
            { name: 'Medicinales', description: 'Vista agregada de uso medicinal' },
            { name: 'IA', description: 'Consulta NLP guardrailed sobre el dominio' },
            { name: 'Chat', description: 'Historial público de consultas' },
            { name: 'Imagenes', description: 'URLs firmadas y proxy de MinIO' },
        ],
        components: {
            schemas: {
                PlantaPublic: {
                    type: 'object',
                    description: 'Proyección pública de Planta (omite idusuario, idautor, estado).',
                    properties: {
                        idplanta: { type: 'integer', example: 12 },
                        nombre: { type: 'string', example: 'Menta' },
                        nombre_cientifico: { type: 'string', nullable: true, example: 'Mentha spicata' },
                        familia: { type: 'string', nullable: true, example: 'Lamiaceae' },
                        subfamilia: { type: 'string', nullable: true },
                        habitad_distribucion: { type: 'string', nullable: true },
                        ciclo_vida: { type: 'string', nullable: true },
                        descripcion: { type: 'string', nullable: true },
                        img: { type: 'string', format: 'uri', nullable: true },
                    },
                },
                DolenciaPublic: {
                    type: 'object',
                    description: 'Proyección pública de Dolencia (omite idusuario, idautor, estado).',
                    properties: {
                        iddolencias: { type: 'integer', example: 3 },
                        descripcion: { type: 'string', example: 'Dolor de cabeza' },
                    },
                },
                PohaPublic: {
                    type: 'object',
                    description: 'Proyección pública de Pohã/remedio (omite idusuario, idautor, estado).',
                    properties: {
                        idpoha: { type: 'integer', example: 42 },
                        preparado: { type: 'string', nullable: true },
                        recomendacion: { type: 'string', nullable: true },
                        mate: { type: 'boolean' },
                        terere: { type: 'boolean' },
                        te: { type: 'boolean' },
                        plantas: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/PlantaPublic' },
                        },
                        dolencias: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/DolenciaPublic' },
                        },
                    },
                },
                MedicinalView: {
                    type: 'object',
                    description: 'Vista agregada vw_medicina (solo lectura).',
                    properties: {
                        idpoha: { type: 'integer' },
                        iddolencias: { type: 'integer' },
                        idplanta: { type: 'integer' },
                        te: { type: 'integer' },
                        mate: { type: 'integer' },
                        terere: { type: 'integer' },
                    },
                },
                NlpExplicaRequest: {
                    type: 'object',
                    required: ['pregunta', 'idusuario'],
                    properties: {
                        pregunta: { type: 'string', maxLength: 500, example: '¿Qué planta sirve para el dolor de cabeza?' },
                        idusuario: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
                    },
                },
                NlpResponse: {
                    type: 'object',
                    properties: {
                        ids: { type: 'array', items: { type: 'integer' } },
                        explicacion: { type: 'string' },
                        imagenes: { type: 'array', items: { type: 'string', format: 'uri' } },
                        fuera_de_dominio: { type: 'boolean' },
                        reason: { type: 'string' },
                    },
                },
                ChatEntry: {
                    type: 'object',
                    properties: {
                        idchat: { type: 'integer' },
                        pregunta: { type: 'string' },
                        respuesta: { type: 'string' },
                        fecha: { type: 'string', format: 'date-time' },
                    },
                },
                SignedUrl: {
                    type: 'object',
                    properties: {
                        original: { type: 'string', format: 'uri' },
                        signed: { type: 'string', format: 'uri' },
                        objectName: { type: 'string' },
                        expiresIn: { type: 'integer' },
                        isMinioUrl: { type: 'boolean' },
                    },
                },
                ImageInfo: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', format: 'uri' },
                        isMinioUrl: { type: 'boolean' },
                        objectName: { type: 'string', nullable: true },
                        needsSigning: { type: 'boolean' },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        items: { type: 'array', items: {} },
                        next_cursor: { type: 'string', nullable: true },
                        total: { type: 'integer', nullable: true },
                    },
                },
                RateLimitInfo: {
                    type: 'object',
                    description:
                        'Headers IETF RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset ' +
                        '(no legacy X-RateLimit-*) están presentes en cada respuesta.',
                    properties: {
                        limit: { type: 'integer' },
                        remaining: { type: 'integer' },
                        reset: { type: 'integer', description: 'Segundos hasta el reset.' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
            parameters: {
                LimitParam: {
                    name: 'limit', in: 'query', required: false,
                    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                    description: 'Tamaño de página (alias de pageSize). Default 20.',
                },
                CursorParam: {
                    name: 'cursor', in: 'query', required: false,
                    schema: { type: 'string' },
                    description: 'Cursor opaco base64url para paginación forward.',
                },
                QueryParam: {
                    name: 'q', in: 'query', required: false,
                    schema: { type: 'string' },
                    description: 'Búsqueda full-text por nombre/descripción.',
                },
                PageParam: {
                    name: 'page', in: 'query', required: false,
                    schema: { type: 'integer', minimum: 0, default: 0 },
                    description: 'Página 0-indexed.',
                },
                PageSizeParam: {
                    name: 'pageSize', in: 'query', required: false,
                    schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
                },
                IdPlantaParam: {
                    name: 'idplanta', in: 'path', required: true,
                    schema: { type: 'integer' },
                },
                IdDolenciasParam: {
                    name: 'iddolencias', in: 'path', required: true,
                    schema: { type: 'integer' },
                },
                IdPohaParam: {
                    name: 'idpoha', in: 'path', required: true,
                    schema: { type: 'integer' },
                },
            },
            responses: {
                ValidationError: {
                    description: 'Input inválido (400).',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
                NotFound: {
                    description: 'Recurso no encontrado (404).',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
                RateLimited: {
                    description:
                        'Rate-limit excedido (429). Incluye headers IETF RateLimit-Limit, ' +
                        'RateLimit-Remaining, RateLimit-Reset.',
                    headers: {
                        'RateLimit-Limit': {
                            schema: { type: 'integer' },
                            description: 'Máximo de requests por ventana.',
                        },
                        'RateLimit-Remaining': {
                            schema: { type: 'integer' },
                            description: 'Requests restantes en la ventana actual.',
                        },
                        'RateLimit-Reset': {
                            schema: { type: 'integer' },
                            description: 'Segundos hasta el reset de la ventana.',
                        },
                    },
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
                ServerError: {
                    description: 'Error interno del servidor (500).',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
            },
        },
    },
    // EXPLICIT list — NO glob. Adding a file here exposes its @swagger blocks.
    // Never add admin, usuario, autor, puntos, dp, pp, chatSearch, queryNLP.
    apis: [
        path.join(__dirname, '../routes/ruta_planta.js'),
        path.join(__dirname, '../routes/ruta_dolencias.js'),
        path.join(__dirname, '../routes/ruta_poha.js'),
        path.join(__dirname, '../routes/ruta_medicinales.js'),
        path.join(__dirname, '../routes/queryNLPExplica.js'),
        path.join(__dirname, '../routes/chatHistorial.js'),
        path.join(__dirname, '../routes/ruta_imagenes.js'),
    ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec, options };
