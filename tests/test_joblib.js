/**
 * Script de prueba simplificado para verificar el cargador de joblib
 */
const joblib_loader = require('./src/utils/joblib_loader');
const path = require('path');

async function testJoblib() {
  try {
    console.log('Probando carga de archivos joblib...');
    
    const MODELS_DIR = path.join(__dirname, 'ONNX');
    const VERSION = 'v20250504';
    
    console.log('Intentando cargar validation_vectorizer...');
    const vectorizerPath = path.join(MODELS_DIR, `validation_vectorizer_${VERSION}.joblib`);
    console.log(`Ruta del archivo: ${vectorizerPath}`);
    
    const data = await joblib_loader.load(vectorizerPath);
    console.log('Archivo cargado con éxito:');
    console.log(data);
    
    return true;
  } catch (error) {
    console.error('Error al cargar archivo joblib:', error);
    return false;
  }
}

testJoblib()
  .then(result => {
    if (result) {
      console.log('Prueba completada con éxito');
    } else {
      console.log('La prueba ha fallado');
    }
  })
  .catch(error => console.error('Error en la prueba:', error));
