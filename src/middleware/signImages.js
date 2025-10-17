const { getPresignedUrl, isMinioUrl, extractObjectName } = require('../services/minioService');

/**
 * Middleware para firmar automáticamente URLs de MinIO en las respuestas
 * Busca campos 'img', 'imagen', 'image' y 'imageUrl' en los objetos de respuesta
 */
const signMinioUrls = async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async function (data) {
    try {
      // Función recursiva para firmar URLs en objetos anidados
      const signUrls = async (obj, depth = 0) => {
        // Limitar profundidad para evitar loops infinitos
        if (depth > 10 || !obj || typeof obj !== 'object') return obj;

        // Si es un array, procesar cada elemento
        if (Array.isArray(obj)) {
          const promises = obj.map(item => signUrls(item, depth + 1));
          return await Promise.all(promises);
        }

        // Si es un objeto, buscar campos de imagen
        const imageFields = ['img', 'imagen', 'image', 'imageUrl', 'photo', 'picture'];
        const newObj = { ...obj };

        for (const field of imageFields) {
          if (newObj[field] && typeof newObj[field] === 'string' && isMinioUrl(newObj[field])) {
            try {
              const objectName = extractObjectName(newObj[field]);
              
              // Timeout de 5 segundos para la firma
              const signPromise = getPresignedUrl(objectName, 86400);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout firmando URL')), 5000)
              );
              
              const signedUrl = await Promise.race([signPromise, timeoutPromise]);
              
              // Agregar tanto la URL original como la firmada
              newObj[`${field}_original`] = newObj[field];
              newObj[field] = signedUrl;
              newObj[`${field}_signed`] = signedUrl;
              newObj[`${field}_expires_in`] = 86400;
            } catch (error) {
              console.error(`❌ Error firmando URL en campo ${field}:`, error.message);
              // Mantener la URL original si falla
            }
          }
        }

        // Procesar objetos anidados
        for (const key in newObj) {
          if (newObj[key] && typeof newObj[key] === 'object') {
            newObj[key] = await signUrls(newObj[key], depth + 1);
          }
        }

        return newObj;
      };

      // Solo firmar si la ruta está en la lista permitida o si se solicita explícitamente
      // Usar req.originalUrl o req.baseUrl para obtener la ruta completa
      const fullPath = req.originalUrl || req.path;
      const shouldSign = 
        req.query.signImages === 'true' || 
        fullPath.includes('/poha') ||
        fullPath.includes('/planta') ||
        fullPath.includes('/medicinales') ||
        fullPath.includes('/query-nlp') ||
        true; // Siempre firmar cuando el middleware está aplicado

      if (shouldSign) {
        // Timeout global de 30 segundos para todo el proceso de firma
        const signPromise = signUrls(data);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout global en firma de URLs')), 30000)
        );
        
        const signedData = await Promise.race([signPromise, timeoutPromise]);
        return originalJson(signedData);
      }

      return originalJson(data);
    } catch (error) {
      console.error('❌ Error en middleware signMinioUrls:', error.message);
      // Si hay error, devolver data sin firmar
      return originalJson(data);
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
