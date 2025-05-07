/**
 * Script para corregir la configuración del modelo ONNX
 */

// Vamos a verificar las dimensiones esperadas por el modelo ONNX
const fs = require('fs');
const path = require('path');
const ort = require('onnxruntime-node');
const joblib = require('./src/utils/joblib_loader');

// Configuración
const MODELS_DIR = path.join(__dirname, 'ONNX');
const VERSION = process.env.MODEL_VERSION || 'v20250504';

async function checkModelDimensions() {
  console.log('Verificando dimensiones del modelo ONNX...');
  
  try {
    // Cargar modelo de interpretación
    const modelPath = path.join(MODELS_DIR, `interpreter_model_${VERSION}.onnx`);
    const session = await ort.InferenceSession.create(modelPath);
    
    // Obtener información sobre entradas y salidas
    console.log('\nEntradas del modelo:');
    for (const inputName of session.inputNames) {
      const meta = session.inputMetadata(inputName);
      console.log(`  - ${inputName}: ${JSON.stringify(meta.shape)}`);
    }
    
    console.log('\nSalidas del modelo:');
    for (const outputName of session.outputNames) {
      const meta = session.outputMetadata(outputName);
      console.log(`  - ${outputName}: ${JSON.stringify(meta.shape)}`);
    }
    
    // Crear archivo de configuración para dimensiones
    const configPath = path.join(MODELS_DIR, 'model_dimensions.json');
    const dimensionsConfig = {
      VERSION,
      interpreter: {
        input: session.inputNames.reduce((acc, name) => {
          acc[name] = session.inputMetadata(name).shape;
          return acc;
        }, {})
      }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(dimensionsConfig, null, 2));
    console.log(`\nConfiguraciones de dimensiones guardadas en ${configPath}`);
    
  } catch (error) {
    console.error('Error al verificar dimensiones:', error);
  }
}

// Para usar recomendación de configuración en validators.js
async function fixVectorizerDimension() {
  try {
    // Intentar cargar el vectorizador
    console.log('Cargando vectorizador...');
    const vectorizerPath = path.join(MODELS_DIR, `interpreter_vectorizer_${VERSION}.joblib`);
    
    // Verificar si existe
    if (!fs.existsSync(vectorizerPath)) {
      console.error(`No se encontró el archivo: ${vectorizerPath}`);
      return;
    }
    
    console.log('Intentando cargar el vectorizador para ajustar dimensiones...');
    
    // Cargar el vectorizador podría fallar debido al error de serialización JSON
    try {
      const vectorizer = await joblib.load(vectorizerPath);
      console.log('Vocabulario del vectorizador:', Object.keys(vectorizer.vocabulary_ || {}).length, 'términos');
    } catch (err) {
      console.warn('Error al cargar vectorizador (esperado):', err.message);
      console.log('Recomendación: Usa interpreterMeta.dimensiones en el código');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Generar un archivo de configuración para validators.js
async function createModelConfig() {
  const configPath = path.join(__dirname, 'src/utils/model_dimensions.js');
  
  const content = `/**
 * Configuración de dimensiones para modelos ONNX
 * Generado automáticamente para resolver problemas de dimensiones
 */

module.exports = {
  VERSION: '${VERSION}',
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
};`;

  fs.writeFileSync(configPath, content);
  console.log(`\nArchivo de configuración de dimensiones creado: ${configPath}`);
}

async function main() {
  console.log('=== Corrigiendo configuración de modelos ONNX ===');
  
  // Verificar dimensiones del modelo
  await checkModelDimensions();
  
  // Verificar vectorizador
  await fixVectorizerDimension();
  
  // Crear archivo de configuración
  await createModelConfig();
  
  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
