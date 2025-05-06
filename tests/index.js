/**
 * Script principal para ejecutar todas las pruebas
 * 
 * Este archivo permite ejecutar todas las pruebas de integración
 * de los modelos ONNX en la aplicación POHAPP
 * 
 * Uso:
 * node tests/index.js [--test=nombre_test]
 */

console.log('=== POHAPP - Sistema de Pruebas de Integración ONNX ===');
console.log(`Fecha de ejecución: ${new Date().toLocaleString()}`);
console.log('-'.repeat(50));

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2);
const testArg = args.find(arg => arg.startsWith('--test='));
const testToRun = testArg ? testArg.split('=')[1] : null;

// Lista de pruebas disponibles
const availableTests = {
  'init': './test_init.js',
  'joblib': './test_joblib.js',
  'models': './test_models.js',
  'simple': './simple_test.js',
  'interpret': './interpret_test.js',
  'search': './search_test.js',
  'full': './full_integration_test.js'
};

// Función para ejecutar una prueba específica
async function runTest(testName) {
  if (!availableTests[testName]) {
    console.error(`❌ Error: La prueba "${testName}" no existe.`);
    return false;
  }
  
  console.log(`\nEjecutando prueba: ${testName}`);
  console.log('-'.repeat(30));
  
  try {
    // Importar dinámicamente el test
    const testModule = require(availableTests[testName]);
    
    // Si el test exporta una función, ejecutarla
    if (typeof testModule === 'function') {
      await testModule();
    } 
    // Si el test exporta un objeto con un método runTest, ejecutarlo
    else if (testModule && typeof testModule.runTest === 'function') {
      await testModule.runTest();
    }
    // En caso contrario, el test se ejecuta automáticamente al importarlo
    
    console.log(`\n✅ Prueba "${testName}" ejecutada`);
    return true;
  } catch (error) {
    console.error(`❌ Error ejecutando la prueba "${testName}":`, error);
    return false;
  }
}

// Función principal para ejecutar las pruebas
async function main() {
  // Si se especificó una prueba concreta, ejecutarla
  if (testToRun) {
    await runTest(testToRun);
  } 
  // De lo contrario, mostrar las pruebas disponibles
  else {
    console.log('\nPruebas disponibles:');
    Object.keys(availableTests).forEach((test, index) => {
      console.log(`  ${index + 1}. ${test} - node tests/index.js --test=${test}`);
    });
    console.log('\nEjemplo de uso: node tests/index.js --test=full');
  }
  
  console.log('\nPara ejecutar una prueba específica:');
  console.log('node tests/index.js --test=nombre_test');
}

// Ejecutar el script
main()
  .then(() => console.log('\nProceso terminado'))
  .catch(error => console.error('Error general:', error));
