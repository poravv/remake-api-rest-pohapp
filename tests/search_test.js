/**
 * Super simple test script for search function
 */

// Importar solo la función validators
const validators = require('./src/utils/validators');
const modelConfig = require('./src/utils/model_config');

// Crear un mock básico de la base de datos
const mockDatabase = {
  query: (sql, params, options) => {
    console.log('SQL ejecutado:', sql);
    console.log('Parámetros:', params);
    
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

// Función principal
async function testSearch() {
  console.log('Inicio de prueba de búsqueda');
  
  try {
    // Usamos directamente el módulo de configuración simulada
    console.log('Modelo simulado para interpretación:', modelConfig.interpreterVectorizer ? 'Disponible' : 'No disponible');
    
    // Una consulta simple para buscar
    const consulta = "Necesito algo para el dolor de cabeza";
    console.log(`Buscando con consulta: "${consulta}"`);
    
    // Establecer las dependencias simuladas
    validators.interpreterVectorizer = modelConfig.interpreterVectorizer;
    validators.interpreterCategories = modelConfig.interpreterCategories;
    
    console.log('Llamando a searchPohaByQuery...');
    const result = await validators.searchPohaByQuery(consulta, mockDatabase);
    
    console.log('Resultado de búsqueda:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error en prueba de búsqueda:', error);
    console.error(error.stack);
  }
}

// Ejecutar la prueba
testSearch()
  .then(() => console.log('Prueba completada'))
  .catch((err) => console.error('Error no capturado:', err));
