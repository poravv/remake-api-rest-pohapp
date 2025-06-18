/**
 * Script extremadamente simple para probar modelos
 */
const validators = require('../src/utils/validators');

async function testInitModels() {
  try {
    console.log('Intentando inicializar modelos...');
    const initialized = await validators.initModels();
    console.log('Resultado de inicialización:', initialized);
    return initialized;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

testInitModels()
  .then(result => {
    if (result) {
      console.log('Inicialización exitosa.');
    } else {
      console.log('Inicialización fallida.');
    }
  })
  .catch(error => console.error('Error general:', error));
