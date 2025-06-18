/**
 * Módulo para cargar archivos joblib usando Python como puente
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Obtiene la ruta del Python a usar (entorno virtual o sistema)
 */
function getPythonPath() {
  // Intentar usar el entorno virtual del proyecto
  const venvPython = path.join(__dirname, '../../venv_pohapp/bin/python3');
  if (fs.existsSync(venvPython)) {
    console.log('🐍 Usando entorno virtual del proyecto');
    return venvPython;
  }

  // Intentar usar la ruta del .env
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    console.log('🐍 Usando Python de variable de entorno');
    return process.env.PYTHON_PATH;
  }

  // Fallback a python3 del sistema
  console.log('🐍 Usando Python del sistema');
  return 'python3';
}

/**
 * Carga un archivo joblib usando un script Python intermedio
 * @param {string} joblibPath - Ruta al archivo joblib a cargar
 * @returns {Promise<any>} - Los datos cargados
 */
async function load(joblibPath) {
  try {
    // Verificar que el archivo existe
    if (!fs.existsSync(joblibPath)) {
      console.warn(`El archivo joblib no existe: ${joblibPath}`);
      return null; // Retornar null en lugar de lanzar error
    }

    // Obtener la ruta de Python
    const pythonPath = getPythonPath();

    // Crear un archivo temporal para el script Python
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `load_joblib_${Date.now()}.py`);

    // Escribir script Python para cargar el archivo joblib
    const pythonScript = `
import joblib
import json
import sys
import numpy as np

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
    if hasattr(data, 'vocabulary_'):
        print("Detectado TfidfVectorizer, exportando solo propiedades necesarias", file=sys.stderr)
        export_data['vocabulary_'] = data.vocabulary_
        export_data['type'] = 'TfidfVectorizer'
        
        # Exportar parámetros importantes evitando funciones
        if hasattr(data, 'idf_'):
            export_data['idf_'] = data.idf_.tolist()
        if hasattr(data, 'max_features'):
            export_data['max_features'] = data.max_features
        if hasattr(data, 'ngram_range'):
            export_data['ngram_range'] = data.ngram_range
        if hasattr(data, 'stop_words_'):
            export_data['stop_words_'] = list(data.stop_words_) if data.stop_words_ else None
            
        # Solo agregar datos serializables
        try:
            if hasattr(data, 'get_feature_names_out'):
                export_data['feature_names'] = data.get_feature_names_out().tolist()
            else:
                export_data['feature_names'] = []
        except:
            export_data['feature_names'] = []
            
    # Si es una lista (como categorías)
    elif isinstance(data, (list, np.ndarray)):
        export_data = data.tolist() if hasattr(data, 'tolist') else list(data)
        
    # Si es un diccionario
    elif isinstance(data, dict):
        export_data = data
        
    # Otros tipos
    else:
        export_data = str(data)

    # Imprimir el resultado en JSON
    print(json.dumps(export_data, cls=NumpyEncoder))

except Exception as e:
    error_info = {
        "error": str(e),
        "type": type(e).__name__,
        "file": '${joblibPath}'
    }
    print(json.dumps(error_info), file=sys.stderr)
    sys.exit(1)
`;

    // Escribir el script temporal
    fs.writeFileSync(scriptPath, pythonScript);

    console.log('🐍 Cargando vectorizador con Python...');

    // Ejecutar el script Python
    const result = spawnSync(pythonPath, [scriptPath], {
      encoding: 'utf8',
      timeout: 30000  // 30 segundos timeout
    });

    // Solo mostrar detalles si hay error
    if (result.status !== 0) {
      console.log('Resultado Python:', {
        status: result.status,
        stdout: result.stdout ? result.stdout.substring(0, 200) + '...' : '',
        stderr: result.stderr || '',
        error: result.error
      });
    }

    // Limpiar archivo temporal
    try {
      fs.unlinkSync(scriptPath);
    } catch (cleanupError) {
      console.warn('Error al limpiar archivo temporal:', cleanupError.message);
    }

    // Verificar errores
    if (result.error) {
      throw new Error(`Error al ejecutar Python: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new Error(`Error al ejecutar Python: ${result.stderr}`);
    }

    if (!result.stdout) {
      throw new Error('No se recibió salida del script Python');
    }

    // Parsear el resultado JSON
    let data;
    try {
      // Buscar la línea que contiene JSON válido
      const lines = result.stdout.split('\n');
      let jsonLine = '';
      
      for (const line of lines) {
        if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
          jsonLine = line.trim();
          break;
        }
      }
      
      if (!jsonLine) {
        throw new Error('No se encontró JSON válido en la salida');
      }
      
      data = JSON.parse(jsonLine);
    } catch (parseError) {
      console.warn('⚠️  Error al parsear JSON del vectorizador:', parseError.message);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Salida recibida:', result.stdout.substring(0, 500) + '...');
      }
      throw new Error(`Error al parsear resultado JSON: ${parseError.message}`);
    }

    // Verificar si hay un error en los datos
    if (data.error) {
      throw new Error(`Error en Python: ${data.error}`);
    }

    console.log('✅ Archivo joblib cargado exitosamente');
    return data;

  } catch (error) {
    console.warn('Error al cargar archivo joblib:', error.message);
    console.warn('Retornando null para permitir fallback');
    return null; // Retornar null en lugar de propagar el error
  }
}

module.exports = {
  load,
  getPythonPath
};
