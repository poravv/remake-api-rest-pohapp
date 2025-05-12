/**
 * Script de prueba para verificar el funcionamiento de la API reorganizada
 */
const axios = require('axios');
const colors = require('colors');

const API_URL = process.env.API_URL || 'http://localhost:3000/api/pohapp';

// Configuración para mostrar colores en terminal
colors.setTheme({
  info: 'blue',
  success: 'green',
  warning: 'yellow',
  error: 'red'
});

/**
 * Realiza una petición a la API
 */
const testEndpoint = async (endpoint, method = 'GET', data = null, showDetails = false) => {
  try {
    const url = `${API_URL}${endpoint}`;
    console.log(`${method} ${url}`.info);

    const options = { method, url };
    if (data) {
      options.data = data;
    }

    const start = new Date();
    const response = await axios(options);
    const end = new Date();
    
    const tiempo = end - start;
    
    console.log(`✅ ${method} ${endpoint} completado en ${tiempo}ms`.success);
    
    if (showDetails) {
      console.log("Respuesta:", JSON.stringify(response.data, null, 2));
    }
    
    return {
      success: true,
      data: response.data,
      status: response.status,
      tiempo
    };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} falló: ${error.message}`.error);
    if (error.response) {
      console.log(`Status: ${error.response.status}`.error);
      console.log(`Respuesta de error:`, error.response.data);
    }
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
};

/**
 * Ejecuta todas las pruebas
 */
const runAllTests = async () => {
  console.log("=== INICIANDO PRUEBAS DE LA API REORGANIZADA ===".info);
  console.log(`URL base: ${API_URL}`.info);

  const tests = [
    // Rutas básicas
    { endpoint: '/status', method: 'GET', name: 'Estado de la API' },
    
    // Poha
    { endpoint: '/poha', method: 'GET', name: 'Listar todos los poha' },
    { endpoint: '/poha/1', method: 'GET', name: 'Obtener poha por ID' },
    
    // Dolencias
    { endpoint: '/dolencias', method: 'GET', name: 'Listar todas las dolencias' },
    { endpoint: '/dolencias/1', method: 'GET', name: 'Obtener dolencia por ID' },
    
    // Plantas
    { endpoint: '/planta', method: 'GET', name: 'Listar todas las plantas' },
    { endpoint: '/planta/1', method: 'GET', name: 'Obtener planta por ID' },
    
    // Autores
    { endpoint: '/autor', method: 'GET', name: 'Listar todos los autores' },
    
    // Medicinales (búsquedas)
    { endpoint: '/medicinales/estadisticas', method: 'GET', name: 'Estadísticas' },
    
    // IA
    { endpoint: '/ia/estado', method: 'GET', name: 'Estado de modelos IA', showDetails: true },
    
    // Usuarios
    { endpoint: '/usuario', method: 'GET', name: 'Listar usuarios' },
  ];

  const results = {
    total: tests.length,
    success: 0,
    failed: 0,
    details: []
  };

  // Ejecutar todas las pruebas
  for (const test of tests) {
    console.log(`\nEjecutando prueba: ${test.name}`.info);
    
    const result = await testEndpoint(
      test.endpoint, 
      test.method, 
      test.data, 
      test.showDetails || false
    );
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }
    
    results.details.push({
      name: test.name,
      ...result
    });
  }

  // Mostrar resumen
  console.log("\n=== RESUMEN DE PRUEBAS ===".info);
  console.log(`Total: ${results.total}`.info);
  console.log(`Exitosas: ${results.success}`.success);
  console.log(`Fallidas: ${results.failed}`.error);
  
  // Mostrar detalles de las pruebas fallidas
  if (results.failed > 0) {
    console.log("\n=== DETALLES DE PRUEBAS FALLIDAS ===".warning);
    results.details
      .filter(d => !d.success)
      .forEach(d => {
        console.log(`❌ ${d.name}`.error);
        console.log(`   Error: ${d.error}`.warning);
      });
  }
  
  return results;
};

// Ejecutar las pruebas
runAllTests()
  .then(() => {
    console.log("\n✅ Pruebas completadas".success);
  })
  .catch(err => {
    console.error("\n❌ Error al ejecutar pruebas:".error, err);
    process.exit(1);
  });
