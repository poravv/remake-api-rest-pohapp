/**
 * Ejemplos de uso de la API de IA para POHAPP
 * 
 * Este archivo contiene ejemplos de código para consumir
 * los endpoints de IA desde aplicaciones cliente.
 */

// Configuración base
const API_BASE = 'http://api.pohapp.com'; // Cambiar según ambiente
const API_KEY = 'your_api_key'; // Solo necesario para endpoints admin
const API_SECRET = 'your_api_secret'; // Solo necesario para endpoints admin

/**
 * Ejemplo 1: Validar texto
 * Esta función verifica si un texto es adecuado y relevante.
 */
async function validarTexto(texto) {
  try {
    const response = await fetch(`${API_BASE}/api/pohapp/ia/validar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texto })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    return {
      esValido: result.isValid,
      confianza: result.confidence,
      puntuacion: result.score
    };
  } catch (error) {
    console.error('Error al validar texto:', error);
    throw error;
  }
}

/**
 * Ejemplo 2: Buscar remedios usando lenguaje natural
 * Esta función permite buscar remedios con consultas en lenguaje humano.
 */
async function buscarRemedios(consulta) {
  try {
    // Codificar consulta para URL
    const queryParam = encodeURIComponent(consulta);
    
    const response = await fetch(`${API_BASE}/api/pohapp/ia/buscar?consulta=${queryParam}`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    return {
      categoriaInterpretada: result.interpretedCategory,
      confianza: result.confidence,
      resultados: result.results,
      totalResultados: result.totalResults
    };
  } catch (error) {
    console.error('Error al buscar remedios:', error);
    throw error;
  }
}

/**
 * Ejemplo 3: Interpretar consulta
 * Esta función analiza una consulta sin realizar búsqueda.
 */
async function interpretarConsulta(consulta) {
  try {
    const queryParam = encodeURIComponent(consulta);
    
    const response = await fetch(`${API_BASE}/api/pohapp/ia/interpretar?consulta=${queryParam}`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    return {
      idCategoria: result.categoryId,
      nombreCategoria: result.categoryName,
      confianza: result.confidence
    };
  } catch (error) {
    console.error('Error al interpretar consulta:', error);
    throw error;
  }
}

/**
 * Ejemplo 4: Uso en la aplicación de medicinales
 */
async function buscarMedicinales(consulta) {
  try {
    const queryParam = encodeURIComponent(consulta);
    
    const response = await fetch(`${API_BASE}/api/pohapp/medicinales/busqueda-natural/${queryParam}`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    return result;
  } catch (error) {
    console.error('Error al buscar medicinales:', error);
    throw error;
  }
}

/**
 * Ejemplo 5: Endpoint administrativo (con firma)
 * Este ejemplo muestra cómo firmar peticiones para endpoints administrativos.
 */
async function recargarModelos() {
  try {
    // Importar módulo para firmas (solo en el servidor)
    // const { generateSignature } = require('./security');
    
    // En el cliente, esto sería una implementación equivalente
    function generateSignature(apiKey, apiSecret, path, body, timestamp) {
      // En el cliente real, implementarías el algoritmo HMAC-SHA256
      // (Esta es solo una representación, no una implementación real)
      console.log('Generando firma para', { apiKey, path, body, timestamp });
      return 'firma_generada_hmac_sha256';
    }
    
    const path = '/api/pohapp/ia/admin/recargar-modelos';
    const body = {};
    const timestamp = Date.now();
    
    // Generar firma
    const signature = generateSignature(
      API_KEY, API_SECRET, path, body, timestamp
    );
    
    // Enviar petición firmada
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signature
      },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    return result;
  } catch (error) {
    console.error('Error al recargar modelos:', error);
    throw error;
  }
}

// Ejemplos de uso
async function ejemplos() {
  try {
    // Ejemplo 1: Validar texto
    const validacion = await validarTexto('El cedrón es una planta medicinal para problemas digestivos');
    console.log('Resultado de validación:', validacion);
    
    // Ejemplo 2: Buscar remedios
    const remedios = await buscarRemedios('Tengo dolor de cabeza');
    console.log('Remedios encontrados:', remedios.totalResultados);
    
    // Ejemplo 3: Interpretar consulta
    const interpretacion = await interpretarConsulta('Remedio para la fiebre');
    console.log('Interpretación:', interpretacion);
    
    // Ejemplo 4: Buscar medicinales
    const medicinales = await buscarMedicinales('Planta para el estómago');
    console.log('Medicinales encontrados:', medicinales);
    
    // Ejemplo 5: Recargar modelos (solo admin)
    // Este ejemplo no se ejecuta automáticamente
    // const recarga = await recargarModelos();
    // console.log('Recarga de modelos:', recarga);
  } catch (error) {
    console.error('Error en ejemplos:', error);
  }
}

// Descomenta para ejecutar ejemplos
// ejemplos();

// Exportar funciones para uso en otras partes de la aplicación
module.exports = {
  validarTexto,
  buscarRemedios,
  interpretarConsulta,
  buscarMedicinales,
  recargarModelos
};
