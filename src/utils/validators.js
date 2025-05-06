const ort = require('onnxruntime-node');
const joblib = require('./joblib_loader');
const path = require('path');
const modelConfig = require('./model_config'); // Configuración básica como fallback

// Configuración de rutas y versión
const MODELS_DIR = path.join(__dirname, '../../ONNX');
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
    try {
      validationSession = await ort.InferenceSession.create(
        path.join(MODELS_DIR, `validation_model_${VERSION}.onnx`)
      );
      console.log('Modelo de validación ONNX cargado correctamente');
    } catch (err) {
      console.warn('Error al cargar modelo de validación ONNX:', err.message);
      console.warn('Usando simulación para validación');
    }
    
    try {
      validationVectorizer = await joblib.load(
        path.join(MODELS_DIR, `validation_vectorizer_${VERSION}.joblib`)
      );
      console.log('Vectorizador de validación cargado correctamente');
    } catch (err) {
      console.warn('Error al cargar vectorizador de validación:', err.message);
      console.warn('Usando vectorizador simulado para validación');
      validationVectorizer = modelConfig.validationVectorizer;
    }
    
    // Cargar modelo de interpretación
    try {
      interpreterSession = await ort.InferenceSession.create(
        path.join(MODELS_DIR, `interpreter_model_${VERSION}.onnx`)
      );
      console.log('Modelo de interpretación ONNX cargado correctamente');
    } catch (err) {
      console.warn('Error al cargar modelo de interpretación ONNX:', err.message);
      console.warn('Usando simulación para interpretación');
    }
    
    try {
      interpreterVectorizer = await joblib.load(
        path.join(MODELS_DIR, `interpreter_vectorizer_${VERSION}.joblib`)
      );
      console.log('Vectorizador de interpretación cargado correctamente');
    } catch (err) {
      console.warn('Error al cargar vectorizador de interpretación:', err.message);
      console.warn('Usando vectorizador simulado para interpretación');
      interpreterVectorizer = modelConfig.interpreterVectorizer;
    }
    
    try {
      interpreterCategories = await joblib.load(
        path.join(MODELS_DIR, `interpreter_categories_${VERSION}.joblib`)
      );
      console.log('Categorías de interpretación cargadas correctamente');
    } catch (err) {
      console.warn('Error al cargar categorías de interpretación:', err.message);
      console.warn('Usando categorías predefinidas para interpretación');
      interpreterCategories = modelConfig.interpreterCategories;
    }
    
    console.log('Modelos inicializados (algunos pueden ser simulados)');
    return true;
  } catch (error) {
    console.error('Error al inicializar modelos:', error);
    // Usar configuraciones básicas como último recurso
    validationVectorizer = modelConfig.validationVectorizer;
    interpreterVectorizer = modelConfig.interpreterVectorizer;
    interpreterCategories = modelConfig.interpreterCategories;
    console.warn('Usando configuración básica como fallback');
    return true; // Retornamos true para que la aplicación pueda continuar
  }
}

// Función de validación de texto
async function validateText(text) {
  try {
    // Preprocesar texto (simplificado)
    const processedText = text.toLowerCase();
    
    // Si tenemos la sesión y el vectorizador, usamos el modelo real
    if (validationSession && validationVectorizer) {
      console.log('Usando modelo real para validación');
      
      // Vectorizar texto (utilizando el vectorizador exportado)
      let textVector;
      if (typeof validationVectorizer.transform === 'function') {
        textVector = validationVectorizer.transform([processedText]);
      } else {
        // Simulación simple: crear un vector usando el vocabulario
        const vocabSize = Object.keys(validationVectorizer.vocabulary_ || {}).length;
        textVector = {
          data: new Float32Array(vocabSize).fill(0.1),
          shape: [1, vocabSize]
        };
      }
      const textVectorFloat = new Float32Array(textVector.data);
      
      try {
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
          confidence_str: confidence.toFixed(4),
          score: probabilities[1] || 0,
          using_model: true
        };
      } catch (inferenceError) {
        console.error('Error en inferencia, usando lógica simulada:', inferenceError);
        // Si falla la inferencia, caemos en la simulación
      }
    }
    
    // SIMULACIÓN si no tenemos modelo o falló la inferencia
    console.log('Usando simulación para validación de texto');
    
    // Lógica simple: textos con al menos 10 caracteres son válidos
    const isValid = processedText.length >= 10 && !processedText.includes('xxx');
    const confidence = isValid ? 0.85 : 0.15;
    
    return {
      isValid,
      confidence,
      confidence_str: confidence.toFixed(4),
      score: isValid ? 0.85 : 0.15,
      using_model: false,
      simulated: true
    };
  } catch (error) {
    console.error('Error en validación de texto:', error);
    return { 
      isValid: false, 
      confidence: 0, 
      score: 0, 
      error: error.message,
      simulated: true
    };
  }
}

// Función de interpretación de consultas
async function interpretQuery(query) {
  try {
    // Preprocesar consulta (simplificado)
    const processedQuery = query.toLowerCase();
    
    // Si tenemos la sesión y el vectorizador, usamos el modelo real
    if (interpreterSession && interpreterVectorizer && interpreterCategories) {
      console.log('Usando modelo real para interpretación');
      try {
        // Vectorizar consulta
        let queryVector;
        if (typeof interpreterVectorizer.transform === 'function') {
          queryVector = interpreterVectorizer.transform([processedQuery]);
        } else {
          // Simulación simple: crear un vector usando el vocabulario
          const vocabSize = Object.keys(interpreterVectorizer.vocabulary_ || {}).length;
          queryVector = {
            data: new Float32Array(vocabSize).fill(0.1),
            shape: [1, vocabSize]
          };
        }
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
          confidence_str: confidence.toFixed(4),
          probabilities: probabilities.map((p, i) => ({ id: i, probability: p })),
          using_model: true
        };
      } catch (inferenceError) {
        console.error('Error en inferencia, usando lógica simulada:', inferenceError);
        // Si falla la inferencia, caemos en la simulación
      }
    }
    
    // SIMULACIÓN si no tenemos modelo o falló la inferencia
    console.log('Usando simulación para interpretación de consulta');
    
    // Simulación: identificar palabras clave para clasificar la consulta
    const keywords = {
      'dolor': 0,
      'cabeza': 0,
      'gripe': 1,
      'estómag': 2,
      'digestión': 2,
      'digestiv': 2,
      'piel': 3,
      'fiebre': 4,
      'tos': 5,
      'garganta': 6,
      'dormir': 8,
      'insomnio': 8,
      'respirator': 9
    };
    
    // Contar coincidencias para cada categoría
    const categoryScores = Array(modelConfig.interpreterCategories.length).fill(0);
    
    // Buscar palabras clave en la consulta
    Object.entries(keywords).forEach(([keyword, categoryId]) => {
      if (processedQuery.includes(keyword)) {
        categoryScores[categoryId] += 1;
      }
    });
    
    // Encontrar la categoría con mayor puntaje
    let maxScore = 0;
    let maxCategoryId = 0;
    
    categoryScores.forEach((score, id) => {
      if (score > maxScore) {
        maxScore = score;
        maxCategoryId = id;
      }
    });
    
    // Si no hay coincidencias, usar una categoría por defecto
    if (maxScore === 0) {
      // Por defecto clasificar como "dolores" general
      maxCategoryId = 0;
    }
    
    // Normalizar scores a probabilidades
    const totalScore = Math.max(1, categoryScores.reduce((sum, score) => sum + score, 0));
    const probabilities = categoryScores.map(score => score / totalScore);
    
    // Obtener el nombre de la categoría
    const categoryName = modelConfig.interpreterCategories[maxCategoryId];
    
    return {
      categoryId: maxCategoryId,
      categoryName,
      confidence: probabilities[maxCategoryId] || 0.7,
      confidence_str: (probabilities[maxCategoryId] || 0.7).toFixed(4),
      probabilities: probabilities.map((p, i) => ({ id: i, probability: p })),
      using_model: false,
      simulated: true
    };
  } catch (error) {
    console.error('Error en interpretación de consulta:', error);
    return { 
      categoryId: -1, 
      categoryName: modelConfig.interpreterCategories[0] || 'dolores',
      confidence: 0.5,
      confidence_str: '0.5000',
      error: error.message,
      simulated: true
    };
  }
}

// Cache para resultados de búsqueda con límite de tiempo y tamaño
const searchCache = new Map();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

// Función para limpiar entradas antiguas del caché
function cleanupCache() {
  const now = Date.now();
  let entriesToDelete = [];
  
  searchCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_TTL) {
      entriesToDelete.push(key);
    }
  });
  
  entriesToDelete.forEach(key => searchCache.delete(key));
  
  // Si el caché sigue siendo demasiado grande después de eliminar entradas expiradas
  if (searchCache.size > CACHE_MAX_SIZE) {
    // Convertir a array para ordenar por timestamp
    const entries = Array.from(searchCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
    // Eliminar el 20% de las entradas más antiguas
    const deleteCount = Math.floor(CACHE_MAX_SIZE * 0.2);
    entries.slice(0, deleteCount).forEach(([key]) => searchCache.delete(key));
  }
}

// Programar limpieza periódica de caché (cada hora)
setInterval(cleanupCache, 60 * 60 * 1000);

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

    // Interpretar la consulta
    const interpretation = await interpretQuery(query);
    
    if (!interpretation.categoryName) {
      return { 
        success: false, 
        error: 'No se pudo interpretar la consulta' 
      };
    }
    
    // Extraer palabras clave adicionales
    const keywords = query.toLowerCase()
      .split(' ')
      .filter(w => w.length > 3)
      .slice(0, 3);
    
    const category = interpretation.categoryName;
    
    // Consulta SQL con parámetros para prevenir SQL injection
    const sql = `
      SELECT 
        p.idpoha, 
        p.preparado, 
        p.recomendacion,
        p.mate,
        p.terere,
        p.te,
        GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ') AS dolencias,
        GROUP_CONCAT(DISTINCT pl.nombre SEPARATOR ', ') AS plantas_nombres,
        GROUP_CONCAT(DISTINCT pl.nombre_cientifico SEPARATOR ', ') AS plantas_cientificos
      FROM 
        poha p
      LEFT JOIN dolencias_poha dp ON p.idpoha = dp.idpoha
      LEFT JOIN dolencias d ON dp.iddolencias = d.iddolencias
      LEFT JOIN poha_planta pp ON p.idpoha = pp.idpoha
      LEFT JOIN planta pl ON pp.idplanta = pl.idplanta
      WHERE 
        p.estado = 'AC' AND (
        d.descripcion LIKE ? OR
        pl.nombre LIKE ? OR
        pl.nombre_cientifico LIKE ? OR
        p.preparado LIKE ? OR
        p.recomendacion LIKE ?)
      GROUP BY 
        p.idpoha, p.preparado, p.recomendacion, p.mate, p.terere, p.te
      LIMIT 50
    `;

    const params = Array(5).fill(`%${category}%`);
    
    // Ejecutar consulta SQL
    const results = await new Promise((resolve, reject) => {
      database.query(sql, params, { type: database.QueryTypes.SELECT })
        .then(results => resolve(results))
        .catch(err => reject(err));
    });

    const result = {
      success: true,
      interpretedCategory: category,
      confidence: interpretation.confidence,
      results: results,
      query: sql,
      keywords,
      totalResults: results.length
    };
    
    // Almacenar en caché antes de devolver (con timestamp)
    result.timestamp = Date.now();
    searchCache.set(cacheKey, result);
    
    // Si el caché ha crecido demasiado, limpiar las entradas antiguas
    if (searchCache.size > CACHE_MAX_SIZE) {
      cleanupCache();
    }
    
    return result;
  } catch (error) {
    console.error('Error en búsqueda:', error);
    return { 
      success: false, 
      error: error.message,
      timestamp: Date.now() 
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
