const { getPresignedUrl, isMinioUrl, extractObjectName } = require('../services/minioService');

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
          if (newObj[field] && typeof newObj[field] === 'string' && isMinioUrl(newObj[field])) {
            urlsFound++;
            try {
              const objectName = extractObjectName(newObj[field]);
              
              // Timeout de 3 segundos para la firma
              const signPromise = getPresignedUrl(objectName, 86400);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 3000)
              );
              
              const signedUrl = await Promise.race([signPromise, timeoutPromise]);
              
              // Agregar tanto la URL original como la firmada
              newObj[`${field}_original`] = newObj[field];
              newObj[field] = signedUrl;
              newObj[`${field}_signed`] = signedUrl;
              newObj[`${field}_expires_in`] = 86400;
              urlsSigned++;
            } catch (error) {
              urlsFailed++;
              console.error(`❌ Error firmando URL: ${newObj[field]} - ${error.message}`);
              // Mantener la URL original si falla
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

      console.log(`🔄 Iniciando firma de URLs para: ${req.method} ${req.path}`);
      const startTime = Date.now();

      // Timeout global de 10 segundos para todo el proceso de firma
      const signPromise = signUrls(cleanData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout global')), 10000)
      );
      
      const signedData = await Promise.race([signPromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Firma completada en ${duration}ms - Encontradas: ${urlsFound}, Firmadas: ${urlsSigned}, Fallidas: ${urlsFailed}`);
      
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
