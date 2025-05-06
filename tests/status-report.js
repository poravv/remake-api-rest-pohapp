#!/usr/bin/env node

/**
 * Herramienta de resumen de pruebas para POHAPP ONNX
 * 
 * Este script genera un informe detallado sobre el estado
 * de la integración de ONNX en la aplicación POHAPP.
 * 
 * Verifica:
 * 1. Disponibilidad de modelos
 * 2. Funcionamiento de carga de modelos
 * 3. Ejecución de pruebas básicas
 * 4. Validación de configuración
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración de colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Función para imprimir un encabezado
function printHeader(text) {
  console.log('\n' + colors.bold + colors.magenta + '='.repeat(50) + colors.reset);
  console.log(colors.bold + colors.magenta + text + colors.reset);
  console.log(colors.bold + colors.magenta + '='.repeat(50) + colors.reset);
}

// Función para imprimir un subencabezado
function printSubHeader(text) {
  console.log('\n' + colors.bold + colors.cyan + text + colors.reset);
  console.log(colors.cyan + '-'.repeat(text.length) + colors.reset);
}

// Función para imprimir un resultado
function printResult(label, status, details = '') {
  const statusColor = status ? colors.green : colors.red;
  const icon = status ? '✅' : '❌';
  const statusText = status ? 'OK' : 'FALLA';
  
  console.log(`${icon} ${colors.bold}${label}:${colors.reset} ${statusColor}${statusText}${colors.reset} ${details}`);
}

// Función para verificar la existencia de un archivo
function checkFile(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Función para verificar la disponibilidad de modelos
function checkModels() {
  printSubHeader('Verificando disponibilidad de modelos');
  
  const modelDir = path.join(__dirname, '..', 'ONNX');
  const modelVersion = 'v20250504';
  
  const requiredFiles = [
    `validation_model_${modelVersion}.onnx`,
    `validation_vectorizer_${modelVersion}.joblib`,
    `interpreter_model_${modelVersion}.onnx`,
    `interpreter_vectorizer_${modelVersion}.joblib`,
    `interpreter_categories_${modelVersion}.joblib`
  ];
  
  let allModelsAvailable = true;
  
  requiredFiles.forEach(file => {
    const filePath = path.join(modelDir, file);
    const exists = checkFile(filePath);
    printResult(file, exists);
    if (!exists) allModelsAvailable = false;
  });
  
  return allModelsAvailable;
}

// Función para verificar la configuración
function checkConfig() {
  printSubHeader('Verificando archivos de configuración');
  
  const configFiles = [
    path.join(__dirname, '..', 'src', 'utils', 'model_config.js'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'src', 'utils', 'joblib_loader.js')
  ];
  
  let allConfigsAvailable = true;
  
  configFiles.forEach(file => {
    const fileName = path.basename(file);
    const exists = checkFile(file);
    printResult(fileName, exists);
    if (!exists) allConfigsAvailable = false;
  });
  
  return allConfigsAvailable;
}

// Función para ejecutar una prueba básica de inicialización
function runBasicTest() {
  printSubHeader('Ejecutando prueba básica de inicialización');
  
  try {
    const testOutput = execSync('node tests/test_init.js', { encoding: 'utf-8' });
    const isSuccessful = testOutput.includes('Inicialización exitosa');
    printResult('Inicialización de modelos', isSuccessful, '\nDetalles de la prueba:');
    
    if (testOutput.trim()) {
      console.log(colors.yellow + '------- Salida de la prueba -------' + colors.reset);
      console.log(testOutput.trim());
      console.log(colors.yellow + '--------------------------------' + colors.reset);
    }
    
    return isSuccessful;
  } catch (error) {
    printResult('Inicialización de modelos', false, `\nError: ${error.message}`);
    return false;
  }
}

// Función para generar recomendaciones
function generateRecommendations(checks) {
  printSubHeader('Recomendaciones');
  
  if (checks.models && checks.config && checks.basicTest) {
    console.log(colors.green + '¡Todos los componentes están funcionando correctamente!' + colors.reset);
    console.log('Recomendaciones:');
    console.log('1. Ejecutar la prueba de integración completa: node tests/index.js --test=full');
    console.log('2. Verificar el rendimiento en un entorno similar a producción');
    console.log('3. Considerar la creación de pruebas unitarias adicionales para casos específicos');
  } else {
    console.log(colors.yellow + 'Se detectaron algunos problemas que deben resolverse:' + colors.reset);
    
    if (!checks.models) {
      console.log('1. Verificar que todos los archivos de modelos existan en la carpeta ONNX');
      console.log('   - Asegúrese de descargar los modelos correctos o entrenarlos nuevamente');
      console.log('   - Verifique que los enlaces simbólicos apunten a los archivos correctos');
    }
    
    if (!checks.config) {
      console.log('2. Verificar los archivos de configuración');
      console.log('   - Cree el archivo .env siguiendo el ejemplo en .env.example');
      console.log('   - Asegúrese de que model_config.js contenga la configuración de fallback adecuada');
    }
    
    if (!checks.basicTest) {
      console.log('3. Revise los errores en las pruebas de inicialización');
      console.log('   - Verifique que las dependencias de Python estén instaladas');
      console.log('   - Compruebe que los modelos tengan el formato correcto');
    }
  }
}

// Función principal
function main() {
  printHeader('INFORME DE ESTADO - INTEGRACIÓN ONNX POHAPP');
  console.log(`Fecha: ${new Date().toLocaleString()}`);
  console.log(`Directorio: ${__dirname}`);
  
  const checks = {
    models: checkModels(),
    config: checkConfig(),
    basicTest: runBasicTest()
  };
  
  const overallStatus = Object.values(checks).every(result => result);
  
  printSubHeader('Resumen general');
  printResult('Estado general del sistema', overallStatus);
  
  generateRecommendations(checks);
}

// Ejecutar el programa
try {
  main();
} catch (error) {
  console.error(colors.red + 'Error fatal en la ejecución del informe:' + colors.reset, error);
  process.exit(1);
}
