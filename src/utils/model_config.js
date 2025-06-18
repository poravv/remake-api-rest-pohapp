/**
 * Configuración básica para los modelos sin depender de joblib
 */

// Definir clases básicas de los vectorizadores basadas en el modelo real
// Estas categorías fueron extraídas del archivo interpreter_categories_v20250504.joblib
const interpreterCategories = [
  "text",
  "fiebre",
  "vómito",
  "catarro",
  "náuseas",
  "ansiedad",
  "insomnio",
  "relajante",
  "mal aliento",
  "desinflamante",
  "estreñimiento",
  "tos irritativa",
  "dolor de garganta",
  "dolores articulares",
  "dolores menstruales"
];

// Función para crear un simulador de vectorizador
function createVectorizer(vocabularySize) {
  return {
    type: "TfidfVectorizer",
    vocabulary_: Array.from({ length: vocabularySize }).reduce((acc, _, i) => {
      acc[`word_${i}`] = i;
      return acc;
    }, {}),
    idf_: Array.from({ length: vocabularySize }).map(() => 1.0),
    transform(text) {
      // Crear un vector con valores aleatorios para simular el proceso
      const vec = new Float32Array(vocabularySize);
      for (let i = 0; i < vocabularySize; i++) {
        vec[i] = Math.random() * 0.1; // Valores pequeños
      }
      return {
        data: vec,
        shape: [1, vocabularySize]
      };
    }
  };
}

module.exports = {
  interpreterCategories,
  validationVectorizer: createVectorizer(100),   // Corregido a 100 dimensiones para validación
  interpreterVectorizer: createVectorizer(51)    // Mantenido en 51 dimensiones para interpretación
};
