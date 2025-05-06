/**
 * Módulo para cargar archivos joblib usando Python como puente
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Carga un archivo joblib usando un script Python intermedio
 * @param {string} joblibPath - Ruta al archivo joblib a cargar
 * @returns {Promise<any>} - Los datos cargados
 */
async function load(joblibPath) {
  try {
    // Verificar que el archivo existe
    if (!fs.existsSync(joblibPath)) {
      throw new Error(`El archivo joblib no existe: ${joblibPath}`);
    }
    
    // Crear un archivo temporal para el script Python
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `load_joblib_${Date.now()}.py`);
    const outputPath = path.join(tempDir, `joblib_data_${Date.now()}.json`);
    
    // Escribir script Python para cargar el archivo joblib
    const pythonScript = `
import joblib
import json
import sys
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# Función para convertir arrays NumPy en listas
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        return json.JSONEncoder.default(self, obj)

# Cargar el archivo joblib
try:
    data = joblib.load('${joblibPath.replace(/\\/g, '\\\\')}')
    
    # Manejar diferentes tipos de objetos
    export_data = {}
    
    # Si es un vectorizador TF-IDF
    if isinstance(data, TfidfVectorizer):
        print("Detectado TfidfVectorizer, exportando solo propiedades necesarias")
        export_data = {
            'type': 'TfidfVectorizer',
            'vocabulary_': data.vocabulary_,
            'idf_': data.idf_.tolist() if hasattr(data, 'idf_') else [],
            'stop_words_': list(data.stop_words_) if hasattr(data, 'stop_words_') else [],
            # Agregamos una función transform simulada
            'transform': lambda texts: {
                'data': np.zeros(len(data.vocabulary_)),
                'shape': [1, len(data.vocabulary_)]
            }
        }
    # Si es una lista o array
    elif isinstance(data, (list, np.ndarray)):
        export_data = data
    # Si es un diccionario
    elif isinstance(data, dict):
        export_data = data
    # Para otros tipos de datos
    else:
        print(f"Tipo de datos desconocido: {type(data)}")
        export_data = str(data)
    
    # Guardar los datos como JSON
    with open('${outputPath.replace(/\\/g, '\\\\')}', 'w') as f:
        json.dump(export_data, f, cls=NumpyEncoder)
    
    print("OK")
    sys.exit(0)
except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;

    // Escribir el script en el archivo temporal
    fs.writeFileSync(scriptPath, pythonScript);
    
    // Ejecutar el script Python
    console.log("Ejecutando script Python...");
    // Intentar primero con python3, luego con python si falla
    let result = spawnSync('python3', [scriptPath], {
      encoding: 'utf-8',
      timeout: 30000, // 30 segundos
      stdio: 'pipe'
    });
    
    // Si python3 no está disponible, intentar con python
    if (result.error && result.error.code === 'ENOENT') {
      console.log("python3 no encontrado, intentando con python...");
      result = spawnSync('python', [scriptPath], {
        encoding: 'utf-8',
        timeout: 30000, // 30 segundos
        stdio: 'pipe'
      });
    }
    
    console.log("Resultado Python:", {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error
    });
    
    // Verificar errores de ejecución
    if (result.status !== 0) {
      throw new Error(`Error al ejecutar Python: ${result.stderr || (result.error && result.error.message) || 'Error desconocido'}`);
    }
    
    // Leer el archivo de salida
    if (!fs.existsSync(outputPath)) {
      throw new Error('No se pudo generar el archivo de salida');
    }
    
    const jsonData = fs.readFileSync(outputPath, 'utf-8');
    const data = JSON.parse(jsonData);
    
    // Limpieza
    try {
      fs.unlinkSync(scriptPath);
      fs.unlinkSync(outputPath);
    } catch (e) {
      console.warn('No se pudieron eliminar archivos temporales:', e);
    }
    
    return data;
  } catch (error) {
    console.error('Error al cargar archivo joblib:', error);
    throw error;
  }
}

// Exportar la función
module.exports = { load };
