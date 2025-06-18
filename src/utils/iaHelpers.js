/**
 * Helpers para funcionalidades de IA
 */
const validators = require('./validators');
const path = require('path');

/**
 * Comprueba el estado de los modelos de IA y los recarga si es necesario
 */
const verificarModelos = async () => {
  try {
    // Verificar si los modelos están cargados
    const estado = validators.obtenerEstadoModelos();
    
    // Si algún modelo no está cargado o está en estado simulado, intentar recargarlo
    if (!estado.validacion.cargado || estado.validacion.simulado ||
        !estado.interpretacion.cargado || estado.interpretacion.simulado) {
      await validators.initModels();
    }
    
    return validators.obtenerEstadoModelos();
  } catch (error) {
    console.error('Error al verificar modelos de IA:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Genera un informe de diagnóstico completo sobre los modelos de IA
 */
const diagnosticoCompleto = async () => {
  try {
    const estado = await verificarModelos();
    const modelosDir = path.join(__dirname, '../../ONNX');
    
    // Verificar existencia de archivos
    const fs = require('fs');
    const archivos = fs.readdirSync(modelosDir);
    
    return {
      ...estado,
      archivosDisponibles: archivos.filter(file => 
        file.endsWith('.onnx') || file.endsWith('.joblib')),
      directorio: modelosDir,
      ambiente: process.env.NODE_ENV || 'development',
      version: process.env.MODEL_VERSION || 'default',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error al generar diagnóstico de IA:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  verificarModelos,
  diagnosticoCompleto
};
