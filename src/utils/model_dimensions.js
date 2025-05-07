/**
 * Configuración de dimensiones para modelos ONNX
 * Generado automáticamente para resolver problemas de dimensiones
 */

module.exports = {
  VERSION: 'v20250504',
  interpreter: {
    inputDimension: 51,  // Dimensión esperada por el modelo según error observado
    categories: [
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
    ]
  }
};
