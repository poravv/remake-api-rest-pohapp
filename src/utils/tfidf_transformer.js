/**
 * Utilidad para realizar transformación TF-IDF usando vectorizadores exportados desde Python
 */

/**
 * Transforma un texto usando los datos de un vectorizador TF-IDF exportado
 * @param {string} text - Texto a transformar
 * @param {Object} vectorizer - Vectorizador con vocabulary_, idf_, y max_features
 * @returns {Object} Vector TF-IDF como {data: Float32Array, shape: [1, n_features]}
 */
function transformText(text, vectorizer) {
  if (!vectorizer || !vectorizer.vocabulary_ || !vectorizer.idf_) {
    throw new Error('Vectorizador inválido: faltan vocabulary_ o idf_');
  }

  // Preprocesar texto: minúsculas y tokenización simple
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Reemplazar puntuación con espacios
    .split(/\s+/)               // Dividir por espacios
    .filter(token => token.length > 0); // Filtrar tokens vacíos

  // Calcular frecuencias de términos (TF)
  const termFreqs = {};
  tokens.forEach(token => {
    termFreqs[token] = (termFreqs[token] || 0) + 1;
  });

  // Crear vector TF-IDF
  const maxFeatures = vectorizer.max_features || Object.keys(vectorizer.vocabulary_).length;
  const tfidfVector = new Float32Array(maxFeatures);

  // Para cada término en el vocabulario
  Object.entries(vectorizer.vocabulary_).forEach(([term, index]) => {
    if (index < maxFeatures && termFreqs[term]) {
      // TF: frecuencia del término / total de términos
      const tf = termFreqs[term] / tokens.length;
      
      // IDF: del vectorizador pre-entrenado
      const idf = vectorizer.idf_[index] || 0;
      
      // TF-IDF = TF * IDF
      tfidfVector[index] = tf * idf;
    }
  });

  return {
    data: tfidfVector,
    shape: [1, maxFeatures]
  };
}

/**
 * Verifica si un vectorizador es válido
 * @param {Object} vectorizer - Vectorizador a verificar
 * @returns {boolean} True si es válido
 */
function isValidVectorizer(vectorizer) {
  return vectorizer && 
         typeof vectorizer.vocabulary_ === 'object' &&
         Array.isArray(vectorizer.idf_) &&
         vectorizer.max_features > 0;
}

/**
 * Obtiene información del vectorizador
 * @param {Object} vectorizer - Vectorizador a analizar
 * @returns {Object} Información del vectorizador
 */
function getVectorizerInfo(vectorizer) {
  if (!vectorizer) return { valid: false };

  return {
    valid: isValidVectorizer(vectorizer),
    type: vectorizer.type || 'unknown',
    vocabSize: Object.keys(vectorizer.vocabulary_ || {}).length,
    maxFeatures: vectorizer.max_features || 0,
    ngramRange: vectorizer.ngram_range || [1, 1],
    hasIdf: Array.isArray(vectorizer.idf_)
  };
}

module.exports = {
  transformText,
  isValidVectorizer,
  getVectorizerInfo
};
