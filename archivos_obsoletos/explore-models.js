/**
 * Utilidad para explorar los modelos ONNX y joblib
 * 
 * Este script analiza los archivos de modelos en la carpeta ONNX
 * y muestra su contenido para entender mejor los datos del modelo.
 */

const path = require('path');
const fs = require('fs');
const joblib = require('./src/utils/joblib_loader');
const ort = require('onnxruntime-node');

// Configuración
const MODELS_DIR = path.join(__dirname, 'ONNX');
const VERSION = process.env.MODEL_VERSION || 'v20250504';

// Función para explorar los archivos de un directorio
async function exploreDirectory(directory) {
  console.log(`\nExplorando directorio: ${directory}`);
  console.log('-'.repeat(50));
  
  try {
    const files = fs.readdirSync(directory);
    console.log(`Se encontraron ${files.length} archivos:`);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        console.log(`📁 ${file} (carpeta)`);
      } else {
        const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
        console.log(`📄 ${file} (${sizeKB} KB)`);
      }
    }
  } catch (error) {
    console.error(`Error al explorar directorio ${directory}:`, error);
  }
}

// Función para explorar archivo ONNX
async function exploreOnnx(filePath) {
  console.log(`\nAnálisis de modelo ONNX: ${path.basename(filePath)}`);
  console.log('-'.repeat(50));
  
  try {
    // Crear sesión de ONNX y obtener metadatos
    const session = await ort.InferenceSession.create(filePath);
    
    console.log('Entradas del modelo:');
    session.inputNames.forEach(name => {
      console.log(` - ${name}`);
    });
    
    console.log('\nSalidas del modelo:');
    session.outputNames.forEach(name => {
      console.log(` - ${name}`);
    });
    
  } catch (error) {
    console.error(`Error al cargar modelo ONNX ${filePath}:`, error);
  }
}

// Función para explorar archivo joblib
async function exploreJoblib(filePath) {
  console.log(`\nAnálisis de archivo joblib: ${path.basename(filePath)}`);
  console.log('-'.repeat(50));
  
  try {
    // Cargar archivo joblib
    const data = await joblib.load(filePath);
    
    console.log('Tipo de datos:', Array.isArray(data) ? 'Array' : typeof data);
    
    // Analizar contenido según tipo
    if (Array.isArray(data)) {
      console.log(`Array con ${data.length} elementos`);
      if (data.length > 0 && data.length < 20) {
        console.log('Contenido:', data);
      } else if (data.length > 0) {
        console.log('Primeros 5 elementos:', data.slice(0, 5));
      }
    } else if (typeof data === 'object') {
      // Mostrar claves del objeto
      const keys = Object.keys(data);
      console.log(`Objeto con ${keys.length} propiedades:`, keys);
      
      // Si tiene vocabulary_, mostrar información de vocabulario
      if (data.vocabulary_) {
        const vocabSize = Object.keys(data.vocabulary_).length;
        console.log(`\nVocabulario encontrado con ${vocabSize} términos`);
        console.log('Muestra de términos:');
        
        // Mostrar 10 ejemplos aleatorios del vocabulario
        const vocabEntries = Object.entries(data.vocabulary_);
        const sampleSize = Math.min(10, vocabEntries.length);
        const randomSample = [];
        
        for (let i = 0; i < sampleSize; i++) {
          const randomIndex = Math.floor(Math.random() * vocabEntries.length);
          randomSample.push(vocabEntries[randomIndex]);
        }
        
        randomSample.forEach(([term, index]) => {
          console.log(` - "${term}": ${index}`);
        });
      }
    }
  } catch (error) {
    console.error(`Error al cargar archivo joblib ${filePath}:`, error);
  }
}

// Función principal para explorar todos los modelos
async function exploreModels() {
  // Explorar directorio
  await exploreDirectory(MODELS_DIR);
  
  // Buscar modelos específicos para la versión actual
  console.log(`\n== Explorando modelos para versión ${VERSION} ==`);
  
  // Explorar modelo de validación
  const validationModelPath = path.join(MODELS_DIR, `validation_model_${VERSION}.onnx`);
  if (fs.existsSync(validationModelPath)) {
    await exploreOnnx(validationModelPath);
  }
  
  // Explorar vectorizador de validación
  const validationVectorizerPath = path.join(MODELS_DIR, `validation_vectorizer_${VERSION}.joblib`);
  if (fs.existsSync(validationVectorizerPath)) {
    await exploreJoblib(validationVectorizerPath);
  }
  
  // Explorar modelo de interpretación
  const interpreterModelPath = path.join(MODELS_DIR, `interpreter_model_${VERSION}.onnx`);
  if (fs.existsSync(interpreterModelPath)) {
    await exploreOnnx(interpreterModelPath);
  }
  
  // Explorar vectorizador de interpretación
  const interpreterVectorizerPath = path.join(MODELS_DIR, `interpreter_vectorizer_${VERSION}.joblib`);
  if (fs.existsSync(interpreterVectorizerPath)) {
    await exploreJoblib(interpreterVectorizerPath);
  }
  
  // Explorar categorías de interpretación
  const interpreterCategoriesPath = path.join(MODELS_DIR, `interpreter_categories_${VERSION}.joblib`);
  if (fs.existsSync(interpreterCategoriesPath)) {
    await exploreJoblib(interpreterCategoriesPath);
  }
}

// Ejecutar exploración
console.log('=== Explorando modelos ONNX y joblib ===');
exploreModels()
  .then(() => console.log('\n✅ Exploración finalizada'))
  .catch(error => console.error('❌ Error durante la exploración:', error));
