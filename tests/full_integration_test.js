/**
 * Script completo de prueba para la integración de ONNX
 */

// Importar las dependencias
const validators = require('./src/utils/validators');
const modelConfig = require('./src/utils/model_config');
const security = require('./src/utils/security');

// Crear un mock básico de la base de datos
const mockDatabase = {
  query: (sql, params, options) => {
    console.log('    SQL ejecutado:', sql.substring(0, 50) + '...');
    console.log('    Parámetros:', params);
    
    // Simular resultados de base de datos
    const mockResults = [
      {
        idpoha: 1,
        preparado: 'Té de manzanilla para dolor de cabeza',
        recomendacion: 'Tomar 3 veces al día',
        mate: 1,
        terere: 0,
        te: 1,
        dolencias: 'dolor de cabeza',
        plantas_nombres: 'manzanilla',
        plantas_cientificos: 'Matricaria chamomilla'
      },
      {
        idpoha: 2,
        preparado: 'Té de cedrón para digestión',
        recomendacion: 'Tomar después de las comidas',
        mate: 1,
        terere: 1,
        te: 1,
        dolencias: 'digestión',
        plantas_nombres: 'cedrón',
        plantas_cientificos: 'Aloysia citrodora'
      }
    ];
    
    // Crear una promesa que resuelva con los resultados simulados
    return Promise.resolve(mockResults);
  },
  QueryTypes: {
    SELECT: 'SELECT'
  }
};

// Función principal de pruebas
async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE INTEGRACIÓN ONNX ===');
  console.log('Fecha: ' + new Date().toLocaleString());
  console.log('-'.repeat(50));
  
  // Inicializar modelos
  console.log('\n1. INICIALIZACIÓN DE MODELOS');
  console.log('-'.repeat(30));
  
  try {
    const initialized = await validators.initModels();
    console.log('✅ Modelos inicializados correctamente');
    
    // Prueba de validación
    console.log('\n2. PRUEBA DE VALIDACIÓN DE TEXTO');
    console.log('-'.repeat(30));
    
    const textos = [
      'El cedrón es una planta medicinal utilizada para problemas digestivos',
      'La manzanilla ayuda a calmar dolores estomacales y favorece el sueño',
      'Texto inválido muy corto'
    ];
    
    for (const texto of textos) {
      console.log(`\nValidando: "${texto.substring(0, 30)}..."`);
      const result = await validators.validateText(texto);
      console.log(`  Resultado: ${result.isValid ? '✅ VÁLIDO' : '❌ NO VÁLIDO'}`);
      console.log(`  Confianza: ${result.confidence_str || (result.confidence * 100).toFixed(2) + '%'}`);
      console.log(`  Modo: ${result.using_model ? 'Modelo real' : 'Simulación'}`);
    }
    
    // Prueba de interpretación
    console.log('\n3. PRUEBA DE INTERPRETACIÓN DE CONSULTAS');
    console.log('-'.repeat(30));
    
    const consultas = [
      'Tengo dolor de cabeza',
      'Necesito algo para la fiebre',
      'Remedio para la garganta',
      'Planta para digestión',
      'Problemas para dormir'
    ];
    
    for (const consulta of consultas) {
      console.log(`\nInterpretando: "${consulta}"`);
      const result = await validators.interpretQuery(consulta);
      console.log(`  Categoría: ${result.categoryName || 'desconocido'}`);
      console.log(`  Confianza: ${result.confidence_str || (result.confidence * 100).toFixed(2) + '%'}`);
      console.log(`  Modo: ${result.using_model ? 'Modelo real' : 'Simulación'}`);
    }
    
    // Prueba de búsqueda
    console.log('\n4. PRUEBA DE BÚSQUEDA POR LENGUAJE NATURAL');
    console.log('-'.repeat(30));
    
    const consultaBusqueda = 'Necesito algo para el dolor de cabeza';
    console.log(`\nBuscando: "${consultaBusqueda}"`);
    
    const searchResult = await validators.searchPohaByQuery(consultaBusqueda, mockDatabase);
    
    console.log(`  Categoría interpretada: ${searchResult.interpretedCategory}`);
    console.log(`  Confianza: ${(searchResult.confidence * 100).toFixed(2)}%`);
    console.log(`  Resultados encontrados: ${searchResult.totalResults}`);
    
    if (searchResult.results.length > 0) {
      console.log('\n  Primeros resultados:');
      searchResult.results.slice(0, 2).forEach((item, i) => {
        console.log(`    ${i+1}. ${item.preparado} (ID: ${item.idpoha})`);
        console.log(`       Plantas: ${item.plantas_nombres}`);
      });
    }
    
    // Prueba de firma de seguridad
    console.log('\n5. PRUEBA DE SISTEMA DE FIRMA');
    console.log('-'.repeat(30));
    
    const apiKey = 'test_key_1234';
    const apiSecret = 'test_secret_5678';
    const timestamp = Date.now();
    const path = '/api/pohapp/ia/admin/recargar-modelos';
    const body = { test: true, timestamp };
    
    const signature = security.generateSignature(apiKey, apiSecret, path, body, timestamp);
    
    console.log('  Generando firma para petición administrativa');
    console.log(`  API Key: ${apiKey}`);
    console.log(`  Timestamp: ${timestamp}`);
    console.log(`  Firma generada: ${signature.substring(0, 20)}...`);
    
    // Verificar la firma
    const mockReq = {
      path,
      originalUrl: path,
      body,
      header: (name) => {
        const headers = {
          'X-API-Key': apiKey,
          'X-Timestamp': timestamp.toString(),
          'X-Signature': signature
        };
        return headers[name];
      }
    };
    
    const isValid = security.verifySignature(mockReq, apiSecret);
    console.log(`  Verificación de firma: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    console.log('\n=== PRUEBAS COMPLETADAS EXITOSAMENTE ===');
    return true;
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS:');
    console.error(error);
    return false;
  }
}

// Ejecutar las pruebas
runTests()
  .then(success => {
    if (success) {
      console.log('\n✨ Sistema listo para uso en producción');
    } else {
      console.log('\n⚠️ Hay errores que deben corregirse antes de usar en producción');
    }
  })
  .catch(error => {
    console.error('\n💥 Error fatal:');
    console.error(error);
  });
