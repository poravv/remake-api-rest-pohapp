/**
 * Super simple test script
 */

// Importar solo la función validators
const validators = require('../src/utils/validators');
const modelConfig = require('../src/utils/model_config');

// Función principal
async function testValidation() {
  console.log('Inicio de prueba simple');
  
  try {
    console.log('Inicializando modelos...');
    await validators.initModels();
    
    // Un texto simple para validar
    const texto = "Este es un texto de prueba";
    console.log(`Validando texto: "${texto}"`);
    
    // Llamar a validateText
    const result = await validators.validateText(texto);
    
    console.log('Resultado de validación:', result);
    
  } catch (error) {
    console.error('Error en prueba simple:', error);
  }
}

// Ejecutar la prueba
testValidation()
  .then(() => console.log('Prueba completada'))
  .catch((err) => console.error('Error no capturado:', err));
