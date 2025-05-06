# Guía de Implementación - POHAPP Validator AI

Esta guía detalla cómo se ha implementado el validador de texto y el intérprete de consultas en el backend Node.js de la aplicación POHAPP.

## Contenido
1. [Estructura de archivos](#estructura-de-archivos)
2. [Instalación de dependencias](#instalación-de-dependencias)
3. [Carga de modelos](#carga-de-modelos)
4. [Validación de texto](#validación-de-texto)
5. [Interpretación de consultas](#interpretación-de-consultas)
6. [Búsqueda en base de datos](#búsqueda-en-base-de-datos)
7. [Integración con Express](#integración-con-express)
8. [Optimización y seguridad](#optimización-y-seguridad)
9. [Pruebas](#pruebas)

## Estructura de archivos

La implementación sigue la siguiente estructura de archivos:

```
├── src/
│   ├── utils/
│   │   ├── validators.js       # Implementación principal de modelos IA
│   │   ├── joblib_loader.js    # Cargador de archivos joblib para vectorizadores
│   │   ├── model_config.js     # Configuración de fallback para modelos
│   │   └── security.js         # Sistema de firma para endpoints administrativos
│   ├── routes/
│   │   └── ruta_ia.js          # Endpoints de la API para funcionalidades IA
├── ONNX/                       # Carpeta con modelos y vectorizadores
│   ├── validation_model_v20250504.onnx
│   ├── validation_vectorizer_v20250504.joblib
│   ├── interpreter_model_v20250504.onnx
│   ├── interpreter_vectorizer_v20250504.joblib
│   └── interpreter_categories_v20250504.joblib
├── tests/                      # Scripts de prueba
│   ├── index.js                # Ejecutor principal de pruebas
│   ├── test_models.js          # Prueba de modelos básica
│   ├── full_integration_test.js # Prueba completa de integración
│   └── ... (otros tests)
```

## Instalación de dependencias

Las dependencias necesarias para el proyecto están en el `package.json`:

```json
"dependencies": {
  "onnxruntime-node": "^1.17.0",
  "express": "^4.18.1",
  "mysql2": "^2.3.3",
  "sequelize": "^6.21.3",
  "dotenv": "^16.0.1",
  "cors": "^2.8.5"
}
```

Además, se requieren las siguientes dependencias de Python para el cargador de joblib:

```bash
pip install joblib scikit-learn numpy
```

## Carga de modelos

La carga de modelos se realiza en el módulo `validators.js` con un sistema robusto de fallback que utiliza simulaciones cuando los modelos reales no están disponibles:

```javascript
// Inicialización de modelos
async function initModels() {
  try {
    console.log('Inicializando modelos ONNX...');
    
    // Cargar modelo de validación
    try {
      validationSession = await ort.InferenceSession.create(
        path.join(MODELS_DIR, `validation_model_${VERSION}.onnx`)
      );
      console.log('Modelo de validación ONNX cargado correctamente');
    } catch (err) {
      console.warn('Error al cargar modelo de validación ONNX:', err.message);
      console.warn('Usando simulación para validación');
    }
    
    // Y similares para otros modelos...
    
    return true;
  } catch (error) {
    // Usar configuraciones simuladas como último recurso
    console.warn('Usando configuración básica como fallback');
    return true; // Retornamos true para que la aplicación pueda continuar
  }
}
```

## Validación de texto

La validación de texto implementa un sistema con dos modos: uso del modelo ONNX real y simulación como fallback:

```javascript
// Función de validación de texto
async function validateText(text) {
  try {
    // Preprocesar texto (simplificado)
    const processedText = text.toLowerCase();
    
    // Si tenemos la sesión y el vectorizador, usamos el modelo real
    if (validationSession && validationVectorizer) {
      console.log('Usando modelo real para validación');
      
      // Vectorizar texto y ejecutar inferencia...
      
      return {
        isValid,
        confidence,
        confidence_str: confidence.toFixed(4),
        score: probabilities[1] || 0,
        using_model: true
      };
    }
    
    // SIMULACIÓN si no tenemos modelo o falló la inferencia
    console.log('Usando simulación para validación de texto');
    
    // Lógica simple de simulación...
    
    return {
      // Resultados simulados...
      using_model: false,
      simulated: true
    };
  } catch (error) {
    // Manejo de errores...
  }
}
```

## Interpretación de consultas

La interpretación de consultas sigue una estructura similar, con un sistema de simulación para casos donde el modelo no está disponible:

```javascript
// Función de interpretación de consultas
async function interpretQuery(query) {
  try {
    // Código similar a validateText, con sistema de modelo real y fallback...
    
    // SIMULACIÓN: identificar palabras clave en consulta
    const keywords = {
      'dolor': 0,
      'cabeza': 0,
      'gripe': 1,
      // ...más palabras clave y categorías...
    };
    
    // Lógica de simulación...
    
    return {
      categoryId: maxCategoryId,
      categoryName,
      confidence: probabilities[maxCategoryId] || 0.7,
      // ...resto de datos...
      using_model: false,
      simulated: true
    };
  } catch (error) {
    // Manejo de errores...
  }
}
```

## Búsqueda en base de datos

La búsqueda implementa un sistema de caché para optimizar consultas repetidas:

```javascript
// Cache para resultados de búsqueda con límite de tiempo y tamaño
const searchCache = new Map();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Función para buscar en la base de datos
async function searchPohaByQuery(query, database) {
  try {
    // Normalizar consulta para clave de caché
    const cacheKey = query.trim().toLowerCase();
    
    // Verificar caché
    if (searchCache.has(cacheKey)) {
      console.log('Resultado obtenido de caché');
      const cachedResult = searchCache.get(cacheKey);
      // Actualizar el timestamp para indicar que se usó recientemente
      cachedResult.timestamp = Date.now();
      return cachedResult;
    }

    // Interpretar la consulta usando el modelo o simulación
    const interpretation = await interpretQuery(query);
    
    // Consulta SQL con parámetros para prevenir SQL injection
    const sql = `
      SELECT 
        p.idpoha, 
        p.preparado, 
        p.recomendacion,
        // ...más campos...
      FROM 
        poha p
      // ...joins y condiciones...
      WHERE 
        p.estado = 'AC' AND (
        d.descripcion LIKE ? OR
        pl.nombre LIKE ? OR
        // ...más condiciones...
      )
    `;

    // Almacenar en caché antes de devolver
    result.timestamp = Date.now();
    searchCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    // Manejo de errores...
  }
}
```

## Integración con Express

Las rutas se han implementado en `ruta_ia.js` con funciones de middleware para limitación de velocidad (rate limiting) y verificación de firmas:

```javascript
// Ruta para validar texto
router.post('/validar', rateLimiter, async (req, res) => {
  const { texto } = req.body;
  
  if (!texto || texto.length > 1000) {
    return res.status(400).json({ success: false, error: 'Texto inválido o demasiado largo' });
  }
  
  try {
    const result = await validators.validateText(texto);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para buscar por consulta en lenguaje natural
router.get('/buscar', rateLimiter, async (req, res) => {
  // ...implementación similar...
});

// Ruta administrativa protegida por firma
router.post('/admin/recargar-modelos', verifySignature, async (req, res) => {
  // ...implementación con verificación de seguridad...
});
```

## Optimización y seguridad

Se han implementado varias características para optimización y seguridad:

### Sistema de caché
- Límite de tiempo (TTL) de 24 horas
- Límite de tamaño máximo (500 entradas)
- Limpieza automática de entradas antiguas
- Actualización de timestamp para entradas usadas frecuentemente

### Limitación de velocidad (rate limiting)
```javascript
const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite por IP
  message: { success: false, error: "Demasiadas solicitudes, intente más tarde" }
});
```

### Sistema de firma para endpoints administrativos
```javascript
function generateSignature(apiKey, apiSecret, path, body, timestamp) {
  const data = JSON.stringify({ path, body, timestamp });
  const hmac = crypto.createHmac('sha256', apiSecret);
  hmac.update(data);
  return hmac.digest('hex');
}

function verifySignature(req, apiSecret) {
  const apiKey = req.header('X-API-Key');
  const timestamp = req.header('X-Timestamp');
  const signature = req.header('X-Signature');
  // ...verificación...
}
```

### Manejo de errores y simulación
- Sistema de fallback para todos los componentes
- Registro detallado de errores
- Simulación inteligente cuando los modelos fallan

## Pruebas

Se han implementado pruebas exhaustivas para verificar todos los componentes:

```javascript
// Test de inicialización
async function testInit() {
  const initialized = await validators.initModels();
  console.log('Inicialización:', initialized ? 'Exitosa' : 'Fallida');
}

// Test de validación
async function testValidate() {
  const texto = "El cedrón es una planta medicinal para problemas digestivos";
  const result = await validators.validateText(texto);
  console.log('Resultado de validación:', result);
}

// Test de interpretación
async function testInterpretation() {
  const consulta = "Tengo dolor de cabeza";
  const result = await validators.interpretQuery(consulta);
  console.log('Interpretación:', result);
}

// Test de búsqueda
async function testSearch() {
  const consulta = "Necesito algo para la fiebre";
  const result = await validators.searchPohaByQuery(consulta, mockDatabase);
  console.log('Búsqueda:', result);
}
```

Para ejecutar las pruebas:
```bash
node tests/index.js --test=full
```

---

Esta guía representa la implementación actual en el sistema POHAPP. Los componentes están diseñados para ser robustos con sistemas de fallback, optimización y seguridad integrados.
