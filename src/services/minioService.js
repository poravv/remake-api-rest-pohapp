const Minio = require('minio');

const pickPreferredEndpoint = (endpoint, host, fallback) => {
  const normalize = (value) =>
    typeof value === 'string' ? value.replace(/^https?:\/\//, '') : '';
  const ep = normalize(endpoint);
  const hd = normalize(host);
  if (ep.includes('minpoint.')) return ep;
  if (hd.includes('minpoint.')) return hd;
  return ep || hd || fallback;
};

const minioEndpoint = pickPreferredEndpoint(
  process.env.MINIO_ENDPOINT,
  process.env.MINIO_HOST,
  'minpoint.mindtechpy.net',
);
const minioHost = (process.env.MINIO_HOST || minioEndpoint).replace(
  /^https?:\/\//,
  '',
);
const minioSigningHost =
  process.env.MINIO_SIGNING_HOST || minioEndpoint;
const minioUseSSL = process.env.MINIO_USE_SSL !== 'false';
const minioPort = parseInt(
  process.env.MINIO_PORT || (minioUseSSL ? '443' : '80'),
  10,
);
const minioPathStyle = process.env.MINIO_PATH_STYLE
  ? process.env.MINIO_PATH_STYLE === 'true'
  : true;

// Configuración del cliente MinIO (firma contra MINIO_SIGNING_HOST o MINIO_ENDPOINT)
const minioClient = new Minio.Client({
  endPoint: minioSigningHost,
  port: minioPort,
  useSSL: minioUseSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
  region: process.env.MINIO_REGION || 'py-east-1',
  pathStyle: minioPathStyle, // Usar path-style URLs en lugar de virtual-hosted
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'bucket-pohapp';

console.log('🔧 MinIO Client configurado:');
console.log('   - Host (firma):', minioSigningHost);
console.log('   - Endpoint (public):', minioEndpoint);
console.log('   - Bucket:', bucketName);
console.log('   - Region:', process.env.MINIO_REGION || 'py-east-1');
console.log('   - PathStyle:', minioPathStyle);

/**
 * Genera una URL firmada (presigned) para acceder a una imagen privada
 * @param {string} objectName - Nombre del objeto en MinIO (ej: "1000001009.jpg")
 * @param {number} expirySeconds - Tiempo de expiración en segundos (por defecto: 24 horas)
 * @returns {Promise<string>} - URL firmada
 */
const getPresignedUrl = async (objectName, expirySeconds = 86400) => {
  try {
    const normalizeObjectName = (value) => {
      if (!value) return '';
      let cleaned = value.replace(/^\/+/, '');
      const queryIndex = cleaned.indexOf('?');
      if (queryIndex !== -1) {
        cleaned = cleaned.slice(0, queryIndex);
      }
      cleaned = cleaned.replace(/&version_id=null$/i, '').replace(/\?version_id=null$/i, '');
      return cleaned;
    };

    // Remover el prefijo del bucket si viene en la URL completa
    const cleanObjectName = normalizeObjectName(
      objectName
      .replace(`https://${minioEndpoint}/${bucketName}/`, '')
      .replace(`https://${minioHost}/${bucketName}/`, '')
      .replace(
        `https://${minioEndpoint}/api/v1/buckets/${bucketName}/objects/download?preview=true&prefix=`,
        '',
      )
      .replace(
        `https://${minioHost}/api/v1/buckets/${bucketName}/objects/download?preview=true&prefix=`,
        '',
      )
    );

    console.log(`🔗 Generando URL firmada para: ${cleanObjectName}`);
    
    const presignedUrl = await minioClient.presignedGetObject(
      bucketName,
      cleanObjectName,
      expirySeconds
    );
    
    return presignedUrl;
  } catch (error) {
    console.error(`❌ Error generando URL firmada para ${objectName}:`, error);
    throw error;
  }
};

/**
 * Extrae el nombre del objeto desde una URL de MinIO
 * @param {string} url - URL completa de MinIO
 * @returns {string} - Nombre del objeto limpio
 */
const extractObjectName = (url) => {
  if (!url) return '';

  const normalizeObjectName = (value) => {
    if (!value) return '';
    let cleaned = value.replace(/^\/+/, '');
    const queryIndex = cleaned.indexOf('?');
    if (queryIndex !== -1) {
      cleaned = cleaned.slice(0, queryIndex);
    }
    cleaned = cleaned.replace(/&version_id=null$/i, '').replace(/\?version_id=null$/i, '');
    return cleaned;
  };
  
  // Patrones comunes de URLs de MinIO
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hostPattern = `${escapeRegex(minioEndpoint)}|${escapeRegex(minioHost)}`;
  const bucketPattern = escapeRegex(bucketName);
  const patterns = [
    new RegExp(`https?:\\/\\/(?:${hostPattern})\\/${bucketPattern}\\/(.+)`),
    new RegExp(
      `https?:\\/\\/(?:${hostPattern})\\/api\\/v1\\/buckets\\/${bucketPattern}\\/objects\\/download\\?preview=true&prefix=(.+)`,
    ),
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return normalizeObjectName(decodeURIComponent(match[1]));
    }
  }
  
  // Si no coincide con ningún patrón, devolver la URL original
  return normalizeObjectName(url);
};

/**
 * Verifica si una URL es de MinIO
 * @param {string} url - URL a verificar
 * @returns {boolean}
 */
const isMinioUrl = (url) => {
  if (!url) return false;
  return url.includes(minioEndpoint) || url.includes(minioHost);
};

/**
 * Genera URLs firmadas para múltiples objetos
 * @param {Array<string>} urls - Array de URLs de MinIO
 * @param {number} expirySeconds - Tiempo de expiración
 * @returns {Promise<Array<{original: string, signed: string}>>}
 */
const getPresignedUrls = async (urls, expirySeconds = 86400) => {
  const results = [];
  
  for (const url of urls) {
    try {
      if (isMinioUrl(url)) {
        const objectName = extractObjectName(url);
        const signedUrl = await getPresignedUrl(objectName, expirySeconds);
        results.push({ original: url, signed: signedUrl });
      } else {
        // Si no es una URL de MinIO, devolverla sin cambios
        results.push({ original: url, signed: url });
      }
    } catch (error) {
      console.error(`❌ Error procesando URL ${url}:`, error);
      results.push({ original: url, signed: null, error: error.message });
    }
  }
  
  return results;
};

/**
 * Sube una imagen a MinIO
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} contentType - Tipo MIME del archivo
 * @returns {Promise<string>} - URL del objeto subido
 */
const uploadImage = async (fileBuffer, fileName, contentType = 'image/jpeg') => {
  try {
    const metaData = {
      'Content-Type': contentType,
    };

    await minioClient.putObject(
      bucketName,
      fileName,
      fileBuffer,
      fileBuffer.length,
      metaData
    );

    console.log(`✅ Imagen subida: ${fileName}`);
    
    // Generar URL firmada inmediatamente
    const presignedUrl = await getPresignedUrl(fileName);
    return presignedUrl;
  } catch (error) {
    console.error(`❌ Error subiendo imagen ${fileName}:`, error);
    throw error;
  }
};

/**
 * Elimina una imagen de MinIO
 * @param {string} objectName - Nombre del objeto a eliminar
 * @returns {Promise<boolean>}
 */
const deleteImage = async (objectName) => {
  try {
    const cleanObjectName = extractObjectName(objectName);
    await minioClient.removeObject(bucketName, cleanObjectName);
    console.log(`✅ Imagen eliminada: ${cleanObjectName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error eliminando imagen ${objectName}:`, error);
    throw error;
  }
};

/**
 * Lista objetos en MinIO
 * @param {string} prefix - Prefijo para filtrar objetos
 * @returns {Promise<Array<string>>}
 */
const listImages = async (prefix = '') => {
  return new Promise((resolve, reject) => {
    const objects = [];
    const stream = minioClient.listObjects(bucketName, prefix, true);
    
    stream.on('data', (obj) => {
      objects.push(obj.name);
    });
    
    stream.on('error', (err) => {
      console.error('❌ Error listando objetos:', err);
      reject(err);
    });
    
    stream.on('end', () => {
      resolve(objects);
    });
  });
};

module.exports = {
  minioClient,
  getPresignedUrl,
  getPresignedUrls,
  extractObjectName,
  isMinioUrl,
  uploadImage,
  deleteImage,
  listImages,
};
