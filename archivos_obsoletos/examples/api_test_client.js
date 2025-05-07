#!/usr/bin/env node

/**
 * Cliente para probar la API de POHAPP con IA
 * 
 * Este script permite probar la funcionalidad de la API
 * con los modelos de machine learning integrados.
 * 
 * Uso:
 *   node api_test_client.js [endpoint] [parámetros]
 * 
 * Ejemplos:
 *   node api_test_client.js validar "El cedrón es una planta medicinal"
 *   node api_test_client.js buscar "Tengo dolor de cabeza"
 *   node api_test_client.js interpretar "Necesito algo para la fiebre"
 */

const axios = require('axios');

// Configuración básica
const API_URL = process.env.API_URL || 'http://localhost:3000/api/pohapp/ia';

// Función para mostrar ayuda
function showHelp() {
  console.log('POHAPP - Cliente de Prueba para API con IA');
  console.log('===========================================\n');
  console.log('Uso:');
  console.log('  node api_test_client.js [endpoint] [parámetros]\n');
  console.log('Endpoints disponibles:');
  console.log('  validar [texto]        - Validar un texto');
  console.log('  buscar [consulta]      - Buscar remedios según consulta');
  console.log('  interpretar [consulta] - Interpretar una consulta\n');
  console.log('Ejemplos:');
  console.log('  node api_test_client.js validar "El cedrón es una planta medicinal"');
  console.log('  node api_test_client.js buscar "Tengo dolor de cabeza"');
  console.log('  node api_test_client.js interpretar "Necesito algo para la fiebre"');
}

// Función para formatear la respuesta JSON
function prettyJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

// Función para validar texto
async function validarTexto(texto) {
  try {
    console.log(`Validando texto: "${texto}"`);
    const response = await axios.post(`${API_URL}/validar`, { texto });
    console.log('\nRespuesta:');
    console.log(prettyJSON(response.data));
    
    // Mostrar resumen
    if (response.data.success) {
      console.log('\nResumen:');
      console.log(`  Válido: ${response.data.isValid ? 'Sí ✅' : 'No ❌'}`);
      console.log(`  Confianza: ${response.data.confidence_str || response.data.confidence}`);
      console.log(`  Usando modelo real: ${response.data.using_model ? 'Sí' : 'No (simulación)'}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error al validar texto:', error.response?.data || error.message);
  }
}

// Función para buscar remedios
async function buscarRemedios(consulta) {
  try {
    console.log(`Buscando remedios para: "${consulta}"`);
    const response = await axios.get(`${API_URL}/buscar`, {
      params: { consulta }
    });
    console.log('\nRespuesta:');
    console.log(prettyJSON(response.data));
    
    // Mostrar resumen
    if (response.data.success) {
      console.log('\nResumen:');
      console.log(`  Categoría interpretada: ${response.data.interpretedCategory}`);
      console.log(`  Confianza: ${(response.data.confidence * 100).toFixed(2)}%`);
      console.log(`  Total de resultados: ${response.data.totalResults}`);
      
      if (response.data.results && response.data.results.length > 0) {
        console.log('\nPrimeros resultados:');
        response.data.results.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i+1}. ${item.preparado}`);
          console.log(`     Plantas: ${item.plantas_nombres}`);
          console.log(`     Recomendación: ${item.recomendacion}`);
        });
      } else {
        console.log('\nNo se encontraron resultados.');
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error al buscar remedios:', error.response?.data || error.message);
  }
}

// Función para interpretar consulta
async function interpretarConsulta(consulta) {
  try {
    console.log(`Interpretando consulta: "${consulta}"`);
    const response = await axios.get(`${API_URL}/interpretar`, {
      params: { consulta }
    });
    console.log('\nRespuesta:');
    console.log(prettyJSON(response.data));
    
    // Mostrar resumen
    if (response.data.success) {
      console.log('\nResumen:');
      console.log(`  Categoría: ${response.data.categoryName} (ID: ${response.data.categoryId})`);
      console.log(`  Confianza: ${response.data.confidence_str || (response.data.confidence * 100).toFixed(2) + '%'}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error al interpretar consulta:', error.response?.data || error.message);
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  // Verificar argumentos
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const endpoint = args[0].toLowerCase();
  const param = args.slice(1).join(' ');
  
  if (!param) {
    console.error('Error: Falta parámetro requerido');
    showHelp();
    return;
  }
  
  // Ejecutar según el endpoint
  switch (endpoint) {
    case 'validar':
      await validarTexto(param);
      break;
    case 'buscar':
      await buscarRemedios(param);
      break;
    case 'interpretar':
      await interpretarConsulta(param);
      break;
    default:
      console.error(`Error: Endpoint "${endpoint}" no reconocido`);
      showHelp();
  }
}

main().catch(console.error);
