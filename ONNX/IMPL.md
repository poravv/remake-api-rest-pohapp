# Guía de Implementación - POHAPP Validator AI

Esta guía detalla cómo implementar el validador de texto y el intérprete de consultas en un backend Node.js.

## Contenido
1. [Estructura de archivos](#estructura-de-archivos)
2. [Instalación de dependencias](#instalación-de-dependencias)
3. [Carga de modelos](#carga-de-modelos)
4. [Validación de texto](#validación-de-texto)
5. [Interpretación de consultas](#interpretación-de-consultas)
6. [Búsqueda en base de datos](#búsqueda-en-base-de-datos)
7. [Integración con Express](#integración-con-express)
8. [Uso en Frontend](#uso-en-frontend)
9. [Optimización y consideraciones](#optimización-y-consideraciones)

## Estructura de archivos

Para implementar la funcionalidad en tu backend Node.js, necesitas copiar los siguientes archivos de la carpeta `deploy`:

```
├── models/
│   ├── validation_model_v20250504.onnx
│   ├── validation_vectorizer_v20250504.joblib
│   ├── interpreter_model_v20250504.onnx
│   ├── interpreter_vectorizer_v20250504.joblib
│   └── interpreter_categories_v20250504.joblib
```

## Instalación de dependencias

Primero, instala las dependencias necesarias en tu proyecto Node.js:

```bash
npm install onnxruntime-node node-joblib
```

## Carga de modelos

Crea un módulo para gestionar los modelos:

```javascript
// validators.js
const ort = require('onnxruntime-node');
const joblib = require('node-joblib');
const path = require('path');

// Configuración de rutas y versión
const MODELS_DIR = path.join(__dirname, 'models');
const VERSION = 'v20250504'; // Usa la versión actual de tus modelos

// Variables para almacenar las sesiones y vectorizadores
let validationSession;
let validationVectorizer;
let interpreterSession;
let interpreterVectorizer;
let interpreterCategories;

// Inicialización de modelos
async function initModels() {
  try {
    console.log('Inicializando modelos ONNX...');
    
    // Cargar modelo de validación
    validationSession = await ort.InferenceSession.create(
      path.join(MODELS_DIR, `validation_model_${VERSION}.onnx`)
    );
    validationVectorizer = await joblib.load(
      path.join(MODELS_DIR, `validation_vectorizer_${VERSION}.joblib`)
    );
    
    // Cargar modelo de interpretación
    interpreterSession = await ort.InferenceSession.create(
      path.join(MODELS_DIR, `interpreter_model_${VERSION}.onnx`)
    );
    interpreterVectorizer = await joblib.load(
      path.join(MODELS_DIR, `interpreter_vectorizer_${VERSION}.joblib`)
    );
    interpreterCategories = await joblib.load(
      path.join(MODELS_DIR, `interpreter_categories_${VERSION}.joblib`)
    );
    
    console.log('Modelos cargados correctamente');
    return true;
  } catch (error) {
    console.error('Error al inicializar modelos:', error);
    return false;
  }
}

module.exports = { initModels };
```

## Validación de texto

Agrega la función de validación de texto al módulo:

```javascript
// Continúa en validators.js
// ...

// Función de validación de texto
async function validateText(text) {
  try {
    if (!validationSession || !validationVectorizer) {
      throw new Error('Modelos de validación no inicializados');
    }
    
    // Preprocesar texto (simplificado)
    const processedText = text.toLowerCase();
    
    // Vectorizar texto (utilizando el vectorizador exportado)
    const textVector = await validationVectorizer.transform([processedText]);
    const textVectorFloat = new Float32Array(textVector.data);
    
    // Preparar entrada para el modelo
    const inputTensor = new ort.Tensor('float32', textVectorFloat, [1, textVector.shape[1]]);
    const feeds = { [validationSession.inputNames[0]]: inputTensor };
    
    // Ejecutar inferencia
    const results = await validationSession.run(feeds);
    
    // Procesar resultados
    const outputLabel = results[validationSession.outputNames[0]];
    const outputProbs = results[validationSession.outputNames[1]];
    
    const label = outputLabel.data[0];
    const probabilities = Array.from(outputProbs.data);
    const confidence = probabilities[label];
    const isValid = label === 1;
    
    return {
      isValid,
      confidence,
      score: probabilities[1] || 0
    };
  } catch (error) {
    console.error('Error en validación de texto:', error);
    return { 
      isValid: false, 
      confidence: 0, 
      score: 0, 
      error: error.message 
    };
  }
}

// Modificar exports
module.exports = { initModels, validateText };
```

## Interpretación de consultas

Agrega la función de interpretación de consultas:

```javascript
// Continúa en validators.js
// ...

// Función de interpretación de consultas
async function interpretQuery(query) {
  try {
    if (!interpreterSession || !interpreterVectorizer) {
      throw new Error('Modelos de interpretación no inicializados');
    }
    
    // Preprocesar consulta (simplificado)
    const processedQuery = query.toLowerCase();
    
    // Vectorizar consulta
    const queryVector = await interpreterVectorizer.transform([processedQuery]);
    const queryVectorFloat = new Float32Array(queryVector.data);
    
    // Preparar entrada para el modelo
    const inputTensor = new ort.Tensor('float32', queryVectorFloat, [1, queryVector.shape[1]]);
    const feeds = { [interpreterSession.inputNames[0]]: inputTensor };
    
    // Ejecutar inferencia
    const results = await interpreterSession.run(feeds);
    
    // Procesar resultados
    const outputLabel = results[interpreterSession.outputNames[0]];
    const outputProbs = results[interpreterSession.outputNames[1]];
    
    const labelId = outputLabel.data[0];
    const probabilities = Array.from(outputProbs.data);
    const confidence = probabilities[labelId];
    
    // Obtener nombre de categoría
    let categoryName = null;
    if (interpreterCategories && labelId < interpreterCategories.length) {
      categoryName = interpreterCategories[labelId];
    }
    
    return {
      categoryId: labelId,
      categoryName,
      confidence,
      probabilities: probabilities.map((p, i) => ({ id: i, probability: p }))
    };
  } catch (error) {
    console.error('Error en interpretación de consulta:', error);
    return { 
      categoryId: -1, 
      categoryName: null, 
      confidence: 0, 
      error: error.message 
    };
  }
}

// Actualizar exports
module.exports = { initModels, validateText, interpretQuery };
```

## Búsqueda en base de datos

Implementa la función de búsqueda que usa la interpretación de consultas:

```javascript
// Continuación en validators.js
// ...

// Función para buscar en la base de datos MySQL
async function searchPohaByQuery(query, dbConnection) {
  try {
    // Interpretar la consulta
    const interpretation = await interpretQuery(query);
    
    if (!interpretation.categoryName) {
      return { 
        success: false, 
        error: 'No se pudo interpretar la consulta' 
      };
    }
    
    // Extraer palabras clave adicionales (simplificado)
    const keywords = query.toLowerCase()
      .split(' ')
      .filter(w => w.length > 3)
      .slice(0, 3);
    
    // Construir consulta SQL
    let sql = `
      SELECT idpoha, preparado, recomendacion
      FROM vwpoha
      WHERE 
        dolencias LIKE ? OR
        plantas_nombres LIKE ? OR
        plantas_cientificos LIKE ? OR
        preparado LIKE ? OR
        recomendacion LIKE ?
      LIMIT 50
    `;
    
    const category = interpretation.categoryName;
    const searchParams = [
      `%${category}%`,
      `%${category}%`,
      `%${category}%`,
      `%${category}%`,
      `%${category}%`
    ];
    
    // Ejecutar consulta SQL
    return new Promise((resolve, reject) => {
      dbConnection.query(sql, searchParams, (err, results) => {
        if (err) {
          reject({ success: false, error: err.message });
        } else {
          resolve({
            success: true,
            interpretedCategory: category,
            confidence: interpretation.confidence,
            results: results,
            query: sql,
            keywords
          });
        }
      });
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Exportar todas las funciones
module.exports = {
  initModels,
  validateText,
  interpretQuery,
  searchPohaByQuery
};
```

## Integración con Express

Integra las funciones con tu aplicación Express:

```javascript
// app.js
const express = require('express');
const mysql = require('mysql2');
const validators = require('./validators');

const app = express();
app.use(express.json());

// Configuración de MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3308,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'db-pohapp'
});

// Inicializar modelos al arrancar
(async () => {
  const initialized = await validators.initModels();
  if (!initialized) {
    console.error('No se pudieron inicializar los modelos ONNX');
    process.exit(1);
  }
})();

// Ruta para validar texto
app.post('/api/validate', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ success: false, error: 'Se requiere texto para validar' });
  }
  
  try {
    const result = await validators.validateText(text);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para buscar por consulta en lenguaje natural
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ success: false, error: 'Se requiere una consulta para buscar' });
  }
  
  try {
    const result = await validators.searchPohaByQuery(query, db);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});
```

## Uso en Frontend

Ejemplo de cómo usar las API desde el frontend:

```javascript
// Ejemplo de uso desde el cliente
async function validatePlantDescription(description) {
  const response = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: description })
  });
  
  const result = await response.json();
  
  if (result.isValid) {
    console.log(`✅ Texto válido (confianza: ${result.confidence.toFixed(2)})`);
  } else {
    console.log(`❌ Texto inválido o inapropiado`);
  }
  
  return result;
}

async function searchPlantsByQuery(query) {
  const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
  const result = await response.json();
  
  if (result.success) {
    console.log(`Categoría interpretada: ${result.interpretedCategory}`);
    console.log(`Resultados encontrados: ${result.results.length}`);
    
    // Mostrar resultados
    result.results.forEach(poha => {
      console.log(`- ID: ${poha.idpoha}, Preparado: ${poha.preparado.substring(0, 50)}...`);
    });
  } else {
    console.log(`Error en búsqueda: ${result.error}`);
  }
  
  return result;
}
```

## Optimización y consideraciones

### 1. Manejo de versiones
Mantén un control de versiones para tus modelos. El código usa la constante `VERSION` para cargar archivos específicos.

### 2. Preprocesamiento de texto
La implementación actual incluye preprocesamiento mínimo. Para mayor precisión, considera implementar:
- Eliminación de stopwords
- Lematización
- Normalización de acentos

### 3. Almacenamiento en caché
Implementa almacenamiento en caché para consultas frecuentes:

```javascript
// Cache simple para resultados de búsqueda
const searchCache = new Map();

// Modificar searchPohaByQuery para usar caché
async function searchPohaByQuery(query, dbConnection) {
  // Normalizar consulta para clave de caché
  const cacheKey = query.trim().toLowerCase();
  
  // Verificar caché
  if (searchCache.has(cacheKey)) {
    console.log('Resultado obtenido de caché');
    return searchCache.get(cacheKey);
  }
  
  // Resto del código de búsqueda...
  
  // Almacenar en caché antes de devolver
  searchCache.set(cacheKey, result);
  return result;
}
```

### 4. Seguridad
- Valida y sanea las entradas de usuario para prevenir inyecciones SQL
- Implementa límites de frecuencia (rate limiting) en las API
- Considera usar consultas parametrizadas para prevenir SQL injection:

```javascript
// Ejemplo de consulta parametrizada segura
const sql = `
  SELECT idpoha, preparado, recomendacion
  FROM vwpoha
  WHERE 
    dolencias LIKE CONCAT('%', ?, '%') OR
    plantas_nombres LIKE CONCAT('%', ?, '%') OR
    plantas_cientificos LIKE CONCAT('%', ?, '%') OR
    preparado LIKE CONCAT('%', ?, '%') OR
    recomendacion LIKE CONCAT('%', ?, '%')
  LIMIT 50
`;

const params = Array(5).fill(category);
```

### 5. Manejo de errores
Mejora el manejo de errores implementando registro detallado y códigos HTTP apropiados.

### 6. Actualización de modelos
Crea un proceso para actualizar los modelos en producción:

```javascript
app.post('/api/admin/reload-models', async (req, res) => {
  // Verificar autenticación (simplificado)
  if (req.headers['api-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  
  try {
    const initialized = await validators.initModels();
    res.json({ success: initialized });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

Esta guía proporciona los pasos básicos para implementar la validación de texto y el filtro de búsqueda en un backend Node.js. Adapta el código según las necesidades específicas de tu proyecto y arquitectura.
