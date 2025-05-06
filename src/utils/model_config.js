/**
 * Configuración básica para los modelos sin depender de joblib
 */

// Definir clases básicas de los vectorizadores
const interpreterCategories = [
  "dolores",
  "gripe",
  "digestión",
  "piel",
  "fiebre",
  "tos",
  "garganta",
  "dolor de cabeza",
  "insomnio",
  "respiratorio"
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
  validationVectorizer: createVectorizer(100),
  interpreterVectorizer: createVectorizer(150)
};
