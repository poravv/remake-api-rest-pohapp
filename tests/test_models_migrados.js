/**
 * Test para verificar que los modelos migrados funcionan correctamente
 * Autor: Andres Vera
 * Fecha: 12/05/2025
 */

// Importar modelos desde la nueva estructura
const { 
  Autor, 
  Dolencias, 
  DolenciasPoha,
  Planta,
  Poha,
  PohaPlanta,
  Puntos,
  Usuario,
  database
} = require('../src/models');

// Función para probar la conexión a la base de datos
async function testDatabaseConnection() {
  try {
    await database.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error);
    return false;
  }
}

// Función para probar los modelos migrados
async function testModels() {
  console.log('\n======== PROBANDO MODELOS MIGRADOS ========');
  
  try {
    // Probar Autor
    const autores = await Autor.obtenerTodos();
    console.log(`✅ Modelo Autor: ${autores.length} registros encontrados`);
    
    // Probar Dolencias
    const dolencias = await Dolencias.obtenerTodos();
    console.log(`✅ Modelo Dolencias: ${dolencias.length} registros encontrados`);
    
    // Probar Planta
    const plantas = await Planta.obtenerTodos();
    console.log(`✅ Modelo Planta: ${plantas.length} registros encontrados`);
    
    // Probar Poha
    const pohas = await Poha.obtenerTodos();
    console.log(`✅ Modelo Poha: ${pohas.length} registros encontrados`);
    
    // Probar Usuario
    const usuarios = await Usuario.obtenerTodos();
    console.log(`✅ Modelo Usuario: ${usuarios.length} registros encontrados`);
    
    // Probar PohaPlanta
    const pohaPlanta = await PohaPlanta.obtenerTodos();
    console.log(`✅ Modelo PohaPlanta: ${pohaPlanta.length} registros encontrados`);
    
    // Probar DolenciasPoha
    const dolenciasPoha = await DolenciasPoha.obtenerTodos();
    console.log(`✅ Modelo DolenciasPoha: ${dolenciasPoha.length} registros encontrados`);
    
    // Probar Puntos
    const puntos = await Puntos.obtenerTodos();
    console.log(`✅ Modelo Puntos: ${puntos.length} registros encontrados`);
    
    console.log('\n✅ TODOS LOS MODELOS ESTÁN FUNCIONANDO CORRECTAMENTE\n');
    return true;
  } catch (error) {
    console.error('❌ Error al probar los modelos:', error);
    return false;
  }
}

// Ejecutar las pruebas
async function runTests() {
  // Probar conexión a la base de datos
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.error('❌ No se puede continuar con las pruebas debido a problemas de conexión');
    process.exit(1);
  }
  
  // Probar los modelos
  const modelsOk = await testModels();
  
  if (!modelsOk) {
    console.error('❌ Las pruebas de los modelos han fallado');
    process.exit(1);
  }
  
  console.log('✅ MIGRACIÓN COMPLETADA CON ÉXITO');
  
  // Cerrar la conexión a la base de datos
  await database.close();
  process.exit(0);
}

// Ejecutar las pruebas
runTests().catch(error => {
  console.error('Error inesperado:', error);
  process.exit(1);
});
