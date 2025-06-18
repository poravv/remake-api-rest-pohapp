const ort = require('onnxruntime-node');
const joblib = require('./joblib_loader');
const path = require('path');
const modelConfig = require('./model_config'); // Configuración básica como fallback
const modelDimensions = require('./model_dimensions'); // Dimensiones correctas para los modelos
const tfidf = require('./tfidf_transformer'); // Transformación TF-IDF manual

// Configuración de rutas y versión
const MODELS_DIR = path.join(__dirname, '../../ONNX');
const VERSION = process.env.MODEL_VERSION || 'v20250504'; // Usa la versión actual de tus modelos

// Variables para almacenar las sesiones y vectorizadores
let validationSession;
let validationVectorizer;
let interpreterSession;
let interpreterVectorizer;
let interpreterCategories;

// Inicialización de modelos
async function initModels() {
  try {
    console.log('🤖 Inicializando modelos de IA POHAPP...');
  
  // Verificar disponibilidad de joblib de forma simple
  try {
    // Verificar si la función existe antes de llamarla
    if (typeof joblib.testJoblibAvailability === 'function') {
      const joblibAvailable = await joblib.testJoblibAvailability();
      if (!joblibAvailable) {
        console.log('📋 joblib no está disponible. Usando vectorizadores simulados.');
        console.log('   💡 Para usar modelos reales: source venv_pohapp/bin/activate');
      } else {
        console.log('✅ joblib disponible y funcional');
      }
    } else {
      console.log('📋 Usando vectorizadores simulados (modo estándar)');
    }
  } catch (error) {
    console.log('📋 Continuando con vectorizadores simulados');
  }

    // Cargar modelo de validación
    try {
      validationSession = await ort.InferenceSession.create(
        path.join(MODELS_DIR, `validation_model_${VERSION}.onnx`)
      );
      console.log('✅ Modelo de validación ONNX cargado');
    } catch (err) {
      console.log('📋 Modelo de validación usando fallback:', err.message);
    }

    try {
      validationVectorizer = await joblib.load(
        path.join(MODELS_DIR, `validation_vectorizer_${VERSION}.joblib`)
      );
      console.log('✅ Vectorizador de validación cargado');
    } catch (err) {
      console.log('📋 Vectorizador de validación: usando simulado');
      validationVectorizer = modelConfig.validationVectorizer;
    }

    // Cargar modelo de interpretación
    try {
      interpreterSession = await ort.InferenceSession.create(
        path.join(MODELS_DIR, `interpreter_model_${VERSION}.onnx`)
      );
      console.log('✅ Modelo de interpretación ONNX cargado');
    } catch (err) {
      console.log('📋 Modelo de interpretación usando fallback:', err.message);
    }

    try {
      interpreterVectorizer = await joblib.load(
        path.join(MODELS_DIR, `interpreter_vectorizer_${VERSION}.joblib`)
      );
      console.log('✅ Vectorizador de interpretación cargado');
    } catch (err) {
      console.log('📋 Vectorizador de interpretación: usando simulado');
      interpreterVectorizer = modelConfig.interpreterVectorizer;
    }

    try {
      interpreterCategories = await joblib.load(
        path.join(MODELS_DIR, `interpreter_categories_${VERSION}.joblib`)
      );
      console.log('✅ Categorías de interpretación cargadas');
    } catch (err) {
      console.log('📋 Categorías de interpretación: usando predefinidas');
      interpreterCategories = modelConfig.interpreterCategories;
    }

    console.log('🎯 Modelos de IA inicializados correctamente');
    return true;
  } catch (error) {
    console.error('Error al inicializar modelos:', error);
    // Usar configuraciones básicas como último recurso
    validationVectorizer = modelConfig.validationVectorizer;
    interpreterVectorizer = modelConfig.interpreterVectorizer;
    interpreterCategories = modelConfig.interpreterCategories;
    console.log('📋 Usando configuración básica como fallback');
    return true; // Retornamos true para que la aplicación pueda continuar
  }
}

// Función de validación de texto
async function validateText(text) {
  try {
    // Preprocesar texto (simplificado)
    const processedText = text.toLowerCase();

    // Si tenemos la sesión y el vectorizador, usamos el modelo real
    if (validationSession && validationVectorizer && tfidf.isValidVectorizer(validationVectorizer)) {
      console.log('🔍 Usando modelo ONNX real para validación');

      try {
        // Vectorizar texto usando transformación TF-IDF manual
        const textVector = tfidf.transformText(processedText, validationVectorizer);
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
          confidence_str: confidence.toFixed(4),
          score: probabilities[1] || 0,
          using_model: true,
          model_version: VERSION
        };
      } catch (inferenceError) {
        console.error('❌ Error en inferencia ONNX:', inferenceError.message);
        // Si falla la inferencia, caemos en la simulación
      }
    } else if (validationSession && !tfidf.isValidVectorizer(validationVectorizer)) {
      console.log('⚠️ Modelo ONNX disponible pero vectorizador inválido');
    }

    // SIMULACIÓN si no tenemos modelo o falló la inferencia
    console.log('🎭 Usando simulación para validación de texto');

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
    if (interpreterSession && interpreterVectorizer && interpreterCategories && 
        tfidf.isValidVectorizer(interpreterVectorizer)) {
      console.log('🔍 Usando modelo ONNX real para interpretación');
      
      try {
        // Vectorizar consulta usando transformación TF-IDF manual
        const queryVector = tfidf.transformText(processedQuery, interpreterVectorizer);
        
        // Usar la dimensión correcta del modelo desde la configuración
        const expectedDimension = modelDimensions.interpreter.inputDimension; // 51 dimensiones

        console.log('Dimensiones esperadas por el modelo:', expectedDimension);
        console.log('Dimensiones del vector generado:', queryVector.shape[1]);

        // Preparar vector para el modelo
        let queryVectorFloat;

        // Si las dimensiones coinciden, usar directamente
        if (queryVector.shape[1] === expectedDimension) {
          queryVectorFloat = new Float32Array(queryVector.data);
        } else {
          // Solo mostrar warning si realmente hay diferencia
          console.warn(`⚠️  Ajustando dimensiones del vector de ${queryVector.shape[1]} a ${expectedDimension}`);
          // Crear un nuevo vector con la dimensión esperada
          const adjustedVector = new Float32Array(expectedDimension);
          // Copiar los valores que podamos del vector original
          const minDimension = Math.min(queryVector.data.length, expectedDimension);
          for (let i = 0; i < minDimension; i++) {
            adjustedVector[i] = queryVector.data[i];
          }
          queryVectorFloat = adjustedVector;
        }
        
        // Preparar entrada para el modelo
        const inputTensor = new ort.Tensor('float32', queryVectorFloat, [1, expectedDimension]);
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
          using_model: true,
          model_version: VERSION
        };
      } catch (inferenceError) {
        console.error('❌ Error en inferencia ONNX:', inferenceError.message);
        // Si falla la inferencia, caemos en la simulación
      }
    } else if (interpreterSession && !tfidf.isValidVectorizer(interpreterVectorizer)) {
      console.log('⚠️ Modelo ONNX disponible pero vectorizador inválido');
    }

    // SIMULACIÓN si no tenemos modelo o falló la inferencia
    console.log('Usando simulación para interpretación de consulta');

    // Intentar extraer palabras clave del vectorizador si está disponible
    let keywords = {};

    if (interpreterVectorizer && interpreterVectorizer.vocabulary_) {
      console.log('Generando keywords a partir del vocabulario del vectorizador');

      // Extraer las palabras más importantes para cada categoría usando el vocabulario
      const vocabulary = interpreterVectorizer.vocabulary_;

      // Mapeo básico de palabras relevantes usando el vocabulario
      Object.keys(vocabulary).forEach(word => {
        // Asignar categorías según palabras clave del vocabulario y las categorías reales
        // de interpreter_categories_v20250504.joblib
        if (word.includes('text')) keywords[word] = 0;
        else if (word.includes('fiebre') || word.includes('temperat')) keywords[word] = 1;
        else if (word.includes('vomit') || word.includes('vómit')) keywords[word] = 2;
        else if (word.includes('catarro') || word.includes('resfr')) keywords[word] = 3;
        else if (word.includes('nause') || word.includes('náuse')) keywords[word] = 4;
        else if (word.includes('ansie') || word.includes('nervios')) keywords[word] = 5;
        else if (word.includes('insomnio') || word.includes('dormir')) keywords[word] = 6;
        else if (word.includes('relaj')) keywords[word] = 7;
        else if (word.includes('aliento')) keywords[word] = 8;
        else if (word.includes('inflam') || word.includes('desinfla') || word.includes('hinchaz')) keywords[word] = 9; // Añadido hinchazón
        else if (word.includes('estreñ') || word.includes('constip')) keywords[word] = 10;
        else if (word.includes('tos')) keywords[word] = 11;
        else if (word.includes('garganta')) keywords[word] = 12;
        else if (word.includes('articul') || word.includes('huesos')) keywords[word] = 13;
        else if (word.includes('menstr') || word.includes('period')) keywords[word] = 14;
      });
    } else {
      console.log('Usando keywords predefinidas (fallback)');

      // Si no tenemos el vectorizador, usamos keywords predefinidas basadas en las categorías reales
      keywords = {
        'text': 0,
        'fiebre': 1, 'temperatura': 1, 'caliente': 1,
        'vómito': 2, 'vomitar': 2, 'devolver': 2,
        'catarro': 3, 'resfriado': 3, 'gripe': 3,
        'náusea': 4, 'mareo': 4, 'malestar': 4, 'estómago': 4,
        'ansiedad': 5, 'nervios': 5, 'estrés': 5,
        'insomnio': 6, 'dormir': 6, 'descansar': 6,
        'relajante': 7, 'relajar': 7, 'relax': 7,
        'aliento': 8, 'boca': 8, 'halitosis': 8,
        'inflamación': 9, 'hinchazón': 9, 'desinflamar': 9, 'abdominal': 9, 'vientre': 9, 'abdomen': 9,
        'estreñimiento': 10, 'constipación': 10, 'evacuar': 10,
        'tos': 11, 'carraspera': 11, 'irritación': 11,
        'garganta': 12, 'angina': 12, 'tragar': 12,
        'articular': 13, 'articulaciones': 13, 'huesos': 13, 'artritis': 13,
        'menstrual': 14, 'regla': 14, 'período': 14, 'menstruación': 14
      };
    }

    // Contar coincidencias para cada categoría - Usar las categorías reales del modelo
    const categoryScores = Array(modelDimensions.interpreter.categories.length).fill(0);

    // Buscar palabras clave en la consulta
    Object.entries(keywords).forEach(([keyword, categoryId]) => {
      if (processedQuery.includes(keyword)) {
        if (categoryId < categoryScores.length) {
          categoryScores[categoryId] += 1;
        }
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

    // Obtener el nombre de la categoría desde las dimensiones del modelo
    let categoryName = '';
    if (maxCategoryId < modelDimensions.interpreter.categories.length) {
      categoryName = modelDimensions.interpreter.categories[maxCategoryId];
    } else if (maxCategoryId < modelConfig.interpreterCategories.length) {
      // Fallback al modelConfig si no tenemos la categoría en modelDimensions
      categoryName = modelConfig.interpreterCategories[maxCategoryId];
    } else {
      // Si no hay categoría para este ID, usar un valor por defecto
      categoryName = 'text';
      maxCategoryId = 0;
    }

    return serializeBigInt({
      categoryId: maxCategoryId,
      categoryName,
      confidence: probabilities[maxCategoryId] || 0.7,
      confidence_str: (probabilities[maxCategoryId] || 0.7).toFixed(4),
      probabilities: probabilities.map((p, i) => ({ id: i, probability: p })),
      using_model: false,
      simulated: true
    });
  } catch (error) {
    console.error('Error en interpretación de consulta:', error);
    return serializeBigInt({
      categoryId: -1,
      categoryName: modelConfig.interpreterCategories[0] || 'text',
      confidence: 0.5,
      confidence_str: '0.5000',
      error: error.message,
      simulated: true
    });
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

// Función para serializar BigInt a string en objetos JSON
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;

  // Si es BigInt, convertirlo a string
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Si es array, procesar cada elemento
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  // Si es objeto, procesar cada propiedad
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInt(value);
    }
    return result;
  }

  // Devolver otros tipos sin cambios
  return obj;
}

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
      return serializeBigInt(cachedResult);
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

    // Consulta SQL mejorada que relaciona las dolencias con las categorías
    // en lugar de hacer búsquedas de texto genéricas

    // Palabras clave extra para búsqueda basadas en la categoría
    const extraKeywords = [];

    // Detección de términos específicos en la consulta
    const queryLower = query.toLowerCase();
    const hasHinchazón = queryLower.includes('hinchaz');
    const hasAbdominal = queryLower.includes('abdom');
    const hasInflamación = queryLower.includes('inflam');

    // Añadir términos específicos según la categoría y la consulta
    if (category === 'desinflamante' || hasHinchazón || hasAbdominal || hasInflamación) {
        extraKeywords.push('hinchazón', 'abdominal', 'inflamación', 'vientre');
        // Forzar la inclusión de términos relacionados con hinchazón abdominal
        if (hasHinchazón && hasAbdominal) {
            extraKeywords.push('hinchazón abdominal'); // Término completo
        }
    } else if (category === 'text') {
        // Para categoría genérica, extraemos palabras clave de la consulta original
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        extraKeywords.push(...queryWords);
    }

    console.log('Palabras clave adicionales para búsqueda:', extraKeywords);

    // Paso 1: Intentar relacionar la categoría con las dolencias en la base de datos
    let dolenciasRelacionadas = [];
    try {
      console.log('Buscando dolencias relacionadas con categoría:', category);

      // Primero buscamos dolencias que coincidan con nuestra categoría
      const dolenciasQuery = `
        SELECT iddolencias, descripcion
        FROM dolencias
        WHERE estado = 'AC' AND (
          descripcion LIKE ? OR
          descripcion LIKE ? OR
          descripcion LIKE ?
          ${extraKeywords.map(() => 'OR descripcion LIKE ?').join(' ')}
        )
        LIMIT 8
      `;

      // Varios patrones de búsqueda para aumentar posibilidades de coincidencia
      let dolenciasParams = [
        `%${category}%`,                        // Contiene la categoría en cualquier parte
        `%${category.split(' ')[0]}%`,         // Contiene la primera palabra
        `%${category.replace(/^(el|la|los|las) /, '')}%` // Sin artículos al inicio
      ];

      // Añadir los parámetros de extraKeywords
      extraKeywords.forEach(keyword => {
        dolenciasParams.push(`%${keyword}%`);
      });

      const dolenciasResultado = await database.query(dolenciasQuery, {
        replacements: dolenciasParams,
        type: database.QueryTypes.SELECT
      });

      if (dolenciasResultado.length > 0) {
        console.log('Dolencias encontradas:', dolenciasResultado.length);
        dolenciasRelacionadas = dolenciasResultado.map(d => d.iddolencias);
      } else {
        console.log('No se encontraron dolencias directamente relacionadas');
      }
    } catch (dolenciaError) {
      console.error('Error al buscar dolencias relacionadas:', dolenciaError);
    }

    // Gestión especial para términos específicos como "hinchazón abdominal"
    let idDolenviasEspecificas = [];
    if (query.toLowerCase().includes('hinchazón abdominal') ||
        query.toLowerCase().includes('hinchazón') && query.toLowerCase().includes('abdominal')) {
        // ID 21 corresponde a "Hinchazón abdominal" según tu base de datos
        console.log('Detectada consulta específica de hinchazón abdominal, forzando coincidencia con ID 21');
        idDolenviasEspecificas.push(21);
    }

    // Consulta simplificada para evitar problemas con la cláusula ORDER BY
    const sql = `
      SELECT
        p.idpoha,
        p.preparado,
        p.recomendacion,
        p.mate,
        p.terere,
        p.te,
        GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ') AS dolencias,
        GROUP_CONCAT(DISTINCT d.iddolencias SEPARATOR ', ') AS dolencias_ids,
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
        ${idDolenviasEspecificas.length > 0 ? `d.iddolencias IN (${idDolenviasEspecificas.join(',')}) OR ` : ''}
        ${dolenciasRelacionadas.length > 0 ? `d.iddolencias IN (${dolenciasRelacionadas.join(',')}) OR ` : ''}
        d.descripcion LIKE ? OR
        pl.nombre LIKE ? OR
        pl.nombre_cientifico LIKE ? OR
        p.preparado LIKE ? OR
        p.recomendacion LIKE ?)
      GROUP BY
        p.idpoha, p.preparado, p.recomendacion, p.mate, p.terere, p.te
      LIMIT 50
    `;

    // Construcción de parámetros para la consulta (simplificada)
    let params = [];

    // Ya no necesitamos estos parámetros porque estamos construyendo los IDs directamente en el SQL
    // if (idDolenviasEspecificas.length > 0) {
    //     params.push(idDolenviasEspecificas);
    // }
    // if (dolenciasRelacionadas.length > 0) {
    //     params.push(dolenciasRelacionadas);
    // }

    // Términos de búsqueda
    const searchTerm = queryLower.includes('hinchaz') && queryLower.includes('abdom')
        ? '%hinchaz%abdom%'
        : `%${category}%`;

    params = params.concat(Array(5).fill(searchTerm));

    // Ejecutar consulta SQL mejorada
    let results = [];
    try {
      console.log('Buscando remedios con categoría:', category);
      console.log('Total de parámetros SQL:', params.length);

      // Ejecutar la consulta principal con los parámetros
      if (params.length > 0 && category) {
        results = await database.query(sql, {
          replacements: params,
          type: database.QueryTypes.SELECT
        });

        console.log(`Se encontraron ${results.length} remedios para la categoría "${category}"`);
      }

      // Si no encontramos resultados con la consulta anterior, usar consulta de respaldo
      if (results.length === 0) {
        console.log('No se encontraron resultados, intentando con consulta de respaldo');

        // Consulta de respaldo: búsqueda más amplia por palabras clave
        const keywordSql = `
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
          WHERE p.estado = 'AC' AND (
            ${keywords.map(() => `
              d.descripcion LIKE ? OR
              pl.nombre LIKE ? OR
              p.preparado LIKE ? OR
              p.recomendacion LIKE ?
            `).join(' OR ')}
          )
          GROUP BY
            p.idpoha, p.preparado, p.recomendacion, p.mate, p.terere, p.te
          LIMIT 20
        `;

        // Generar parámetros para cada palabra clave
        const keywordParams = [];
        keywords.forEach(keyword => {
          if (keyword && keyword.length > 2) {
            keywordParams.push(...Array(4).fill(`%${keyword}%`));
          }
        });

        if (keywordParams.length > 0) {
          const keywordResults = await database.query(keywordSql, {
            replacements: keywordParams,
            type: database.QueryTypes.SELECT
          });

          console.log(`Consulta de respaldo encontró ${keywordResults.length} resultados`);
          results = keywordResults;
        }
      }

      // Si aún no hay resultados, mostrar algunos remedios populares
      if (results.length === 0) {
        console.log('No hay resultados específicos, mostrando remedios populares');
        const defaultSql = `
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
          WHERE p.estado = 'AC'
          GROUP BY
            p.idpoha, p.preparado, p.recomendacion, p.mate, p.terere, p.te
          LIMIT 10
        `;

        results = await database.query(defaultSql, {
          type: database.QueryTypes.SELECT
        });
      }
    } catch (sqlError) {
      console.error('Error en consulta SQL:', sqlError.message);
      // Para debug
      console.error('Consulta SQL fallida:', sql);
      console.error('Parámetros:', params);
      // Devolver array vacío si hay error
      results = [];
    }

    // Enriquecer los resultados con información adicional útil
    const result = {
      success: true,
      interpretedCategory: category,
      confidence: interpretation.confidence,
      results: serializeBigInt(results),
      keywords,
      totalResults: results.length,
      // Añadir metadatos para facilitar el debugging y mejorar la experiencia de usuario
      metadata: {
        categoryId: interpretation.categoryId,
        searchType: results.length > 0 ?
          (dolenciasRelacionadas.length > 0 ? "category_match" : "keyword_match") :
          "default_results",
        matchMethod: dolenciasRelacionadas.length > 0 ? "dolencias_relacionadas" :
                     (keywords.length > 0 ? "palabras_clave" : "general")
      }
    };

    // Almacenar en caché antes de devolver (con timestamp)
    result.timestamp = Date.now();
    searchCache.set(cacheKey, result);

    // Si el caché ha crecido demasiado, limpiar las entradas antiguas
    if (searchCache.size > CACHE_MAX_SIZE) {
      cleanupCache();
    }

    // Asegurarnos de que todos los valores BigInt sean convertidos a string
    return serializeBigInt(result);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// ========================================
// FUNCIONES ADICIONALES PARA EL CONTROLADOR
// ========================================

/**
 * Función para obtener el estado completo de los modelos
 */
function obtenerEstadoModelos() {
  return {
    validacion: {
      cargado: !!validationSession,
      simulado: !validationSession,
      vectorizador: !!validationVectorizer,
      modelPath: validationSession ? 'Modelo ONNX cargado' : 'Usando simulación'
    },
    interpretacion: {
      cargado: !!interpreterSession,
      simulado: !interpreterSession,
      vectorizador: !!interpreterVectorizer,
      categorias: !!interpreterCategories,
      modelPath: interpreterSession ? 'Modelo ONNX cargado' : 'Usando simulación'
    },
    version: VERSION,
    timestamp: new Date().toISOString(),
    dimensiones: modelDimensions
  };
}

/**
 * Función para validar términos medicinales (alias de validateText)
 */
async function validarTerminoMedicinal(termino) {
  try {
    if (!termino || typeof termino !== 'string') {
      return {
        success: false,
        error: 'Término inválido o vacío',
        valido: false,
        confianza: 0
      };
    }

    const resultado = await validateText(termino);
    return {
      success: true,
      valido: resultado.isValid,
      confianza: resultado.confidence,
      mensaje: resultado.isValid ? 'Término válido' : 'Término no válido',
      detalle: resultado,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en validarTerminoMedicinal:', error);
    return {
      success: false,
      error: error.message,
      valido: false,
      confianza: 0
    };
  }
}

/**
 * Función para interpretar términos medicinales (alias de interpretQuery)
 */
async function interpretarTerminoMedicinal(termino) {
  try {
    if (!termino || typeof termino !== 'string') {
      return {
        success: false,
        error: 'Término inválido o vacío',
        categoria: 'desconocido',
        confianza: 0
      };
    }

    const resultado = await interpretQuery(termino);
    
    // Serializar el resultado para evitar problemas con BigInt
    const resultadoSerializado = serializeBigInt(resultado);
    
    return {
      success: true,
      categoria: resultadoSerializado.categoryName,
      confianza: resultadoSerializado.confidence,
      id_categoria: resultadoSerializado.categoryId,
      detalle: resultadoSerializado,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en interpretarTerminoMedicinal:', error);
    return {
      success: false,
      error: error.message,
      categoria: 'desconocido',
      confianza: 0
    };
  }
}

/**
 * Función para buscar términos relacionados basados en la categoría interpretada
 */
async function buscarTerminosRelacionados(termino) {
  try {
    if (!termino || typeof termino !== 'string') {
      return {
        success: false,
        error: 'Término inválido o vacío',
        terminos_relacionados: []
      };
    }

    // Interpretar el término para obtener la categoría
    const interpretacion = await interpretQuery(termino);
    
    // Serializar la interpretación para evitar BigInt
    const interpretacionSerializada = serializeBigInt(interpretacion);
    
    // Términos relacionados por categoría
    const relacionados = {
      'fiebre': ['temperatura', 'calor', 'calentura', 'destemplado', 'febrícula'],
      'vómito': ['náusea', 'mareo', 'devolver', 'estómago', 'digestión'],
      'catarro': ['gripe', 'resfriado', 'congestión', 'mucosidad', 'rinitis'],
      'náusea': ['mareo', 'malestar', 'estómago', 'digestión', 'vómito'],
      'ansiedad': ['nervios', 'estrés', 'preocupación', 'tensión', 'inquietud'],
      'insomnio': ['dormir', 'sueño', 'descanso', 'relajación', 'sedante'],
      'relajante': ['calma', 'tranquilidad', 'serenidad', 'paz', 'sosiego'],
      'mal aliento': ['halitosis', 'boca', 'dientes', 'encías', 'higiene'],
      'desinflamante': ['hinchazón', 'inflamación', 'abdominal', 'vientre', 'antiinflamatorio'],
      'estreñimiento': ['constipación', 'digestión', 'evacuación', 'intestinal', 'laxante'],
      'tos': ['garganta', 'pecho', 'irritación', 'carraspera', 'expectorante'],
      'dolores de garganta': ['angina', 'faringitis', 'amígdalas', 'tragar', 'irritación'],
      'dolores articulares': ['artritis', 'huesos', 'músculos', 'articulaciones', 'antiinflamatorio'],
      'menstrual': ['regla', 'período', 'ciclo', 'menstruación', 'cólicos']
    };

    const terminosRelacionados = relacionados[interpretacionSerializada.categoryName] || 
                                 relacionados['fiebre'] || 
                                 ['medicinal', 'natural', 'planta', 'hierba'];

    return {
      success: true,
      termino_original: termino,
      categoria: interpretacionSerializada.categoryName,
      categoria_id: interpretacionSerializada.categoryId,
      confianza_interpretacion: interpretacionSerializada.confidence,
      terminos_relacionados: terminosRelacionados,
      total: terminosRelacionados.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en buscarTerminosRelacionados:', error);
    return {
      success: false,
      error: error.message,
      terminos_relacionados: []
    };
  }
}

// Exportar todas las funciones y algunas variables para monitoreo
module.exports = {
  // Funciones principales
  initModels,
  validateText,
  interpretQuery,
  searchPohaByQuery,
  
  // Funciones nuevas para el controlador
  obtenerEstadoModelos,
  validarTerminoMedicinal,
  interpretarTerminoMedicinal,
  buscarTerminosRelacionados,

  // Variables para monitoreo del estado
  VERSION,
  get validationSession() { return validationSession; },
  get validationVectorizer() { return validationVectorizer; },
  get interpreterSession() { return interpreterSession; },
  get interpreterVectorizer() { return interpreterVectorizer; },
  get interpreterCategories() { return interpreterCategories; }
};
