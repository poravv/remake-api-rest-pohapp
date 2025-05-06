/**
 * Script simple para probar la API de IA con fetch nativo
 */

// Configuración básica
const API_URL = 'http://localhost:3000/api/pohapp/ia';

// Función para realizar peticiones fetch
async function fetchAPI(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_URL}/${endpoint}`, options);
    return await response.json();
  } catch (error) {
    console.error(`Error al realizar petición a ${endpoint}:`, error);
    return { success: false, error: error.message };
  }
}

// Función para probar el estado
async function testEstado() {
  console.log('Verificando estado de la API de IA...');
  const resultado = await fetchAPI('estado');
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// Función para probar validación
async function testValidar(texto) {
  console.log(`Validando texto: "${texto}"`);
  const resultado = await fetchAPI('validar', 'POST', { texto });
  console.log(JSON.stringify(resultado, null, 2));
  
  if (resultado.success) {
    console.log(`\nResumen:`);
    console.log(`  Válido: ${resultado.isValid ? 'Sí ✅' : 'No ❌'}`);
    console.log(`  Confianza: ${resultado.confidence_str || resultado.confidence}`);
  }
  
  return resultado;
}

// Función para probar interpretación
async function testInterpretar(consulta) {
  console.log(`Interpretando consulta: "${consulta}"`);
  const resultado = await fetchAPI(`interpretar?consulta=${encodeURIComponent(consulta)}`);
  console.log(JSON.stringify(resultado, null, 2));
  
  if (resultado.success) {
    console.log(`\nResumen:`);
    console.log(`  Categoría: ${resultado.categoryName} (ID: ${resultado.categoryId})`);
    console.log(`  Confianza: ${resultado.confidence_str || resultado.confidence}`);
  }
  
  return resultado;
}

// Función para probar búsqueda
async function testBuscar(consulta) {
  console.log(`Buscando remedios para: "${consulta}"`);
  const resultado = await fetchAPI(`buscar?consulta=${encodeURIComponent(consulta)}`);
  console.log(JSON.stringify(resultado, null, 2));
  
  if (resultado.success && resultado.results) {
    console.log(`\nResumen:`);
    console.log(`  Categoría interpretada: ${resultado.interpretedCategory}`);
    console.log(`  Total de resultados: ${resultado.totalResults}`);
    
    if (resultado.results.length > 0) {
      console.log('\nPrimeros resultados:');
      resultado.results.slice(0, 3).forEach((item, i) => {
        console.log(`  ${i+1}. ${item.preparado}`);
        console.log(`     Plantas: ${item.plantas_nombres}`);
      });
    }
  }
  
  return resultado;
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (!args.length || args[0] === '--help' || args[0] === '-h') {
    console.log('Uso: node simple_test_api.js [comando] [parámetros]');
    console.log('\nComandos disponibles:');
    console.log('  estado - Verificar estado de la API');
    console.log('  validar [texto] - Validar un texto');
    console.log('  interpretar [consulta] - Interpretar una consulta');
    console.log('  buscar [consulta] - Buscar remedios por consulta');
    return;
  }
  
  const comando = args[0].toLowerCase();
  const parametro = args.slice(1).join(' ');
  
  switch (comando) {
    case 'estado':
      await testEstado();
      break;
    case 'validar':
      if (!parametro) return console.error('Error: Se requiere un texto para validar');
      await testValidar(parametro);
      break;
    case 'interpretar':
      if (!parametro) return console.error('Error: Se requiere una consulta para interpretar');
      await testInterpretar(parametro);
      break;
    case 'buscar':
      if (!parametro) return console.error('Error: Se requiere una consulta para buscar');
      await testBuscar(parametro);
      break;
    default:
      console.error(`Comando desconocido: ${comando}`);
      console.log('Use --help para ver los comandos disponibles');
  }
}

// Ejecutar script
main().catch(console.error);
