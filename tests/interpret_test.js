/**
 * Super simple test script for interpret query
 */

// Importar solo la función validators
const validators = require('./src/utils/validators');
const modelConfig = require('./src/utils/model_config');

// Función principal
async function testInterpretation() {
  console.log('Inicio de prueba de interpretación');
  
  try {
    // Usamos directamente el módulo de configuración simulada
    console.log('Modelo simulado:', modelConfig.interpreterVectorizer ? 'Disponible' : 'No disponible');
    console.log('Categorías simuladas:', modelConfig.interpreterCategories ? 'Disponibles' : 'No disponibles');
    
    // Una consulta simple para interpretar
    const consulta = "Tengo dolor de cabeza";
    console.log(`Interpretando consulta: "${consulta}"`);
    
    // Establecer las dependencias simuladas
    validators.interpreterVectorizer = modelConfig.interpreterVectorizer;
    validators.interpreterCategories = modelConfig.interpreterCategories;
    
    console.log('Llamando a interpretQuery...');
    const result = await validators.interpretQuery(consulta);
    
    console.log('Resultado de interpretación:', result);
    
  } catch (error) {
    console.error('Error en prueba de interpretación:', error);
  }
}

// Ejecutar la prueba
testInterpretation()
  .then(() => console.log('Prueba completada'))
  .catch((err) => console.error('Error no capturado:', err));
