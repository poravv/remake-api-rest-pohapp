const { getProxyUrl, isMinioUrl, extractObjectName } = require('../services/minioService');

/**
 * Middleware para firmar automáticamente URLs de MinIO en las respuestas
 * Busca campos 'img', 'imagen', 'image' y 'imageUrl' en los objetos de respuesta
 */
const signMinioUrls = async (req, res, next) => {
  // Si el query param disableImageSigning está presente, no firmar
  if (req.query.disableImageSigning === 'true') {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = async function (data) {
    try {
      // Limpiar referencias circulares de Sequelize antes de procesar
      // Esto convierte el objeto a JSON puro eliminando propiedades internas
      let cleanData;
      try {
        cleanData = JSON.parse(JSON.stringify(data));
      } catch (error) {
        console.error('⚠️ No se pudo limpiar referencias circulares, usando data original');
        cleanData = data;
      }

      // Contador para debugging
      let urlsFound = 0;
      let urlsSigned = 0;
      let urlsFailed = 0;

      // Función recursiva para firmar URLs en objetos anidados
      const signUrls = async (obj, depth = 0) => {
        // Limitar profundidad para evitar loops infinitos
        if (depth > 10 || !obj || typeof obj !== 'object') return obj;

        // Si es un array, procesar cada elemento
        if (Array.isArray(obj)) {
          const results = [];
          for (const item of obj) {
            results.push(await signUrls(item, depth + 1));
          }
          return results;
        }

        // Si es un objeto, buscar campos de imagen
        const imageFields = ['img', 'imagen', 'image', 'imageUrl', 'photo', 'picture'];
        const newObj = { ...obj };

        for (const field of imageFields) {
          if (newObj[field] && typeof newObj[field] === 'string') {
            const fieldValue = newObj[field];
            
            // Caso 1: URL completa de MinIO -> URL del PROXY interno del backend
            if (isMinioUrl(fieldValue)) {
              if (fieldValue.includes('/imagenes/proxy/')) {
                continue; // ya es una URL de proxy
              }
              urlsFound++;
              try {
                const objectName = extractObjectName(fieldValue);
                const proxyUrl = getProxyUrl(objectName);
                newObj[`${field}_original`] = fieldValue;
                newObj[field] = proxyUrl;
                newObj[`${field}_signed`] = proxyUrl;
                urlsSigned++;
              } catch (error) {
                urlsFailed++;
                console.error(`❌ Error generando proxy URL: ${fieldValue} - ${error.message}`);
              }
            }
            // Caso 2: Solo un nombre de archivo (key) -> URL del PROXY interno
            else if (fieldValue && !fieldValue.startsWith('http') && fieldValue.trim().length > 0) {
              urlsFound++;
              try {
                const proxyUrl = getProxyUrl(fieldValue);
                newObj[`${field}_original`] = fieldValue; // key original
                newObj[field] = proxyUrl;
                newObj[`${field}_signed`] = proxyUrl;
                urlsSigned++;
              } catch (error) {
                urlsFailed++;
                console.error(`❌ Error generando proxy URL: ${fieldValue} - ${error.message}`);
              }
            }
          }
        }

        // Procesar objetos anidados (evitar procesar buffers y objetos nativos)
        for (const key in newObj) {
          const value = newObj[key];
          if (value && typeof value === 'object' && 
              !(value instanceof Date) && 
              !(value instanceof Buffer)) {
            newObj[key] = await signUrls(value, depth + 1);
          }
        }

        return newObj;
      };

      const startTime = Date.now();

      // Timeout global de 10 segundos para todo el proceso de firma
      const signPromise = signUrls(cleanData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout global')), 10000)
      );
      
      const signedData = await Promise.race([signPromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      // Solo se reporta cuando hubo trabajo real o fallos: firmar 0 URLs en
      // cada respuesta llenaba los logs sin aportar informacion.
      if (urlsSigned > 0 || urlsFailed > 0) {
        console.log(`[IMG] ${urlsSigned} imagen(es) firmada(s) en ${duration}ms${urlsFailed ? ` - ${urlsFailed} fallida(s)` : ''}`);
      }

      return originalJson(signedData);
    } catch (error) {
      console.error(`❌ Error crítico en middleware signMinioUrls: ${error.message}`);
      // Si hay error, devolver data sin firmar pero limpia
      try {
        const cleanData = JSON.parse(JSON.stringify(data));
        return originalJson(cleanData);
      } catch (jsonError) {
        // Si falla la limpieza, devolver data original
        return originalJson(data);
      }
    }
  };

  next();
};

/**
 * Middleware opcional para agregar información de firma en los headers
 */
const addSigningInfo = (req, res, next) => {
  res.setHeader('X-MinIO-Signing-Enabled', 'true');
  res.setHeader('X-MinIO-Signature-Expiry', '86400');
  next();
};

module.exports = {
  signMinioUrls,
  addSigningInfo,
};
