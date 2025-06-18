/**
 * Script de diagnóstico para verificar el estado de los modelos de IA
 * Ejecutar con: node diagnose_ia.js
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 DIAGNÓSTICO DE MODELOS DE IA POHAPP');
console.log('=====================================\n');

// 1. Verificar archivos ONNX
const onnxDir = path.join(__dirname, 'ONNX');
console.log('1. Verificando archivos ONNX...');

const onnxFiles = [
    'query_interpreter_model.onnx',
    'validation_model.onnx',
    'interpreter_model_v20250504.onnx',
    'validation_model_v20250504.onnx'
];

onnxFiles.forEach(file => {
    const filePath = path.join(onnxDir, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
        console.log(`   ❌ ${file} - NO ENCONTRADO`);
    }
});

// 2. Verificar archivos joblib
console.log('\n2. Verificando archivos joblib...');

const joblibFiles = [
    'interpreter_vectorizer.joblib',
    'validation_vectorizer.joblib',
    'interpreter_categories.joblib',
    'interpreter_vectorizer_v20250504.joblib',
    'validation_vectorizer_v20250504.joblib',
    'interpreter_categories_v20250504.joblib'
];

joblibFiles.forEach(file => {
    const filePath = path.join(onnxDir, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
        console.log(`   ❌ ${file} - NO ENCONTRADO`);
    }
});

// 3. Verificar entorno Python
console.log('\n3. Verificando entorno Python...');

const { exec } = require('child_process');

exec('source venv_pohapp/bin/activate && python --version', (error, stdout, stderr) => {
    if (error) {
        console.log('   ❌ Error ejecutando Python:', error.message);
    } else {
        console.log(`   ✅ Python: ${stdout.trim()}`);
    }
});

exec('source venv_pohapp/bin/activate && python -c "import joblib; print(f\'joblib {joblib.__version__}\')"', (error, stdout, stderr) => {
    if (error) {
        console.log('   ❌ joblib no disponible:', error.message);
    } else {
        console.log(`   ✅ ${stdout.trim()}`);
    }
});

exec('source venv_pohapp/bin/activate && python -c "import sklearn; print(f\'scikit-learn {sklearn.__version__}\')"', (error, stdout, stderr) => {
    if (error) {
        console.log('   ❌ scikit-learn no disponible:', error.message);
    } else {
        console.log(`   ✅ ${stdout.trim()}`);
    }
});

// 4. Test de carga de modelos
console.log('\n4. Probando carga de modelos...');

setTimeout(async () => {
    try {
        const validators = require('./src/utils/validators');
        
        console.log('   🔄 Probando obtenerEstadoModelos...');
        const estado = await validators.obtenerEstadoModelos();
        console.log(`   ✅ Estado: ${estado}`);
        
        console.log('   🔄 Probando validarTerminoMedicinal...');
        const validacion = await validators.validarTerminoMedicinal('dolor de cabeza');
        console.log(`   ✅ Validación: ${validacion}`);
        
        console.log('   🔄 Probando interpretarTerminoMedicinal...');
        const interpretacion = await validators.interpretarTerminoMedicinal('me duele la cabeza');
        console.log(`   ✅ Interpretación: ${JSON.stringify(interpretacion)}`);
        
        console.log('   🔄 Probando buscarTerminosRelacionados...');
        const relacionados = await validators.buscarTerminosRelacionados('fiebre');
        console.log(`   ✅ Relacionados: ${relacionados.terminos_relacionados.slice(0, 3).join(', ')}...`);
        
    } catch (error) {
        console.log('   ❌ Error en tests:', error.message);
    }
    
    console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
}, 2000);
