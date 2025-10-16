# Integración MinIO con Pohapp Backend

## 📦 MinIO ya está desplegado en tu cluster

Según tu configuración, MinIO está corriendo en:
- **API**: https://minpoint.mindtechpy.net
- **Console**: https://minio.mindtechpy.net
- **Namespace**: `minio`
- **Storage**: 10Gi en Longhorn

## 🔗 Conectar Backend con MinIO

### 1. Agregar dependencia MinIO al proyecto

Ya tienes `minio` en tu `package.json`. Si no, agrégalo:

```bash
npm install minio --save
```

### 2. Configurar variables de entorno

Agrega estos secrets a GitHub (vía `setup-secrets.sh` o GitHub CLI):

```bash
gh secret set MINIO_ENDPOINT -b "minpoint.mindtechpy.net"
gh secret set MINIO_PORT -b "443"
gh secret set MINIO_USE_SSL -b "true"
gh secret set MINIO_ACCESS_KEY -b "tu_access_key"
gh secret set MINIO_SECRET_KEY -b "tu_secret_key"
gh secret set MINIO_BUCKET -b "pohapp-images"
```

### 3. Actualizar ConfigMap

Edita `k8s/configmap.yaml` para incluir configuración de MinIO:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pohapp-backend-config
  namespace: pohapp-backend
data:
  # Database Configuration
  MYSQL_DB: "db-pohapp"
  MYSQL_HOST: "mysql-service"
  MYSQL_PORT: "3306"
  
  # Application Configuration
  APP_NAME: "Pohapp Backend API"
  API_VERSION: "v1.0.0"
  
  # Model Configuration
  MODEL_VERSION: "v20250504"
  
  # MinIO Configuration
  MINIO_ENDPOINT: "minpoint.mindtechpy.net"
  MINIO_PORT: "443"
  MINIO_USE_SSL: "true"
  MINIO_BUCKET: "pohapp-images"
```

### 4. Actualizar workflow para incluir secrets de MinIO

Edita `.github/workflows/deploy.yml`, sección de secrets:

```yaml
- name: Create/Update application secrets
  run: |
    set -euo pipefail
    kubectl delete secret pohapp-backend-env-secrets -n ${{ env.NAMESPACE }} --ignore-not-found=true
    kubectl create secret generic pohapp-backend-env-secrets \
      --namespace=${{ env.NAMESPACE }} \
      --from-literal=DB_HOST="${{ secrets.DB_HOST }}" \
      --from-literal=DB_PORT="${{ secrets.DB_PORT }}" \
      --from-literal=DB_USER="${{ secrets.DB_USER }}" \
      --from-literal=DB_PASSWORD="${{ secrets.DB_PASSWORD }}" \
      --from-literal=DB_DATABASE="${{ secrets.DB_DATABASE }}" \
      --from-literal=DB_NAME="${{ secrets.DB_NAME }}" \
      --from-literal=NODE_ENV="production" \
      --from-literal=PORT="3000" \
      --from-literal=POHAPP_API_SECRET="${{ secrets.POHAPP_API_SECRET }}" \
      --from-literal=POHAPP_ADMIN_KEY="${{ secrets.POHAPP_ADMIN_KEY }}" \
      --from-literal=MODEL_VERSION="${{ secrets.MODEL_VERSION }}" \
      --from-literal=OPENAI_API_KEY="${{ secrets.OPENAI_API_KEY }}" \
      --from-literal=MINIO_ACCESS_KEY="${{ secrets.MINIO_ACCESS_KEY }}" \
      --from-literal=MINIO_SECRET_KEY="${{ secrets.MINIO_SECRET_KEY }}"
```

### 5. Crear servicio MinIO en tu backend

Crea `src/services/minioService.js`:

```javascript
const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minpoint.mindtechpy.net',
  port: parseInt(process.env.MINIO_PORT || '443'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const bucketName = process.env.MINIO_BUCKET || 'pohapp-images';

// Asegurar que el bucket existe
const ensureBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`✅ Bucket ${bucketName} creado`);
      
      // Hacer el bucket público para lectura
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`✅ Bucket ${bucketName} configurado como público`);
    }
  } catch (err) {
    console.error('Error al verificar/crear bucket:', err);
  }
};

// Subir imagen
const uploadImage = async (file, filename) => {
  try {
    await ensureBucket();
    
    const metaData = {
      'Content-Type': file.mimetype,
    };
    
    await minioClient.putObject(
      bucketName,
      filename,
      file.buffer,
      file.size,
      metaData
    );
    
    // Generar URL pública
    const url = `https://${process.env.MINIO_ENDPOINT}/${bucketName}/${filename}`;
    return url;
  } catch (err) {
    console.error('Error al subir imagen:', err);
    throw err;
  }
};

// Eliminar imagen
const deleteImage = async (filename) => {
  try {
    await minioClient.removeObject(bucketName, filename);
    return true;
  } catch (err) {
    console.error('Error al eliminar imagen:', err);
    throw err;
  }
};

// Listar imágenes
const listImages = async (prefix = '') => {
  try {
    const stream = minioClient.listObjects(bucketName, prefix, true);
    const objects = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => objects.push(obj));
      stream.on('error', reject);
      stream.on('end', () => resolve(objects));
    });
  } catch (err) {
    console.error('Error al listar imágenes:', err);
    throw err;
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  listImages,
  minioClient,
  bucketName,
};
```

### 6. Usar MinIO en tus rutas

Ejemplo en `src/routes/ruta_planta.js`:

```javascript
const express = require('express');
const multer = require('multer');
const { uploadImage, deleteImage } = require('../services/minioService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Subir imagen de planta
router.post('/planta/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó imagen' });
    }
    
    const filename = `plantas/${Date.now()}-${req.file.originalname}`;
    const imageUrl = await uploadImage(req.file, filename);
    
    res.json({
      success: true,
      url: imageUrl,
      filename: filename,
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// Eliminar imagen de planta
router.delete('/planta/image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    await deleteImage(`plantas/${filename}`);
    
    res.json({ success: true, message: 'Imagen eliminada' });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

module.exports = router;
```

### 7. Agregar multer para manejar uploads

```bash
npm install multer --save
```

## 🔒 Seguridad

### Obtener Access Key y Secret Key de MinIO

1. Accede a la consola de MinIO: https://minio.mindtechpy.net
2. Login con las credenciales (MINIO_ROOT_USER y MINIO_ROOT_PASSWORD)
3. Ve a "Access Keys" o "Identity" → "Service Accounts"
4. Crea un nuevo Access Key
5. Copia el Access Key y Secret Key
6. Agrégalos a los secrets de GitHub

### Configurar CORS en MinIO (si es necesario)

Desde la consola de MinIO o via `mc` (MinIO Client):

```bash
# Instalar mc
brew install minio/stable/mc

# Configurar alias
mc alias set myminio https://minpoint.mindtechpy.net ACCESS_KEY SECRET_KEY

# Configurar CORS
mc anonymous set-json myminio/pohapp-images <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::pohapp-images/*"]
    }
  ]
}
EOF
```

## 🧪 Testing

### Test de conexión MinIO

Crea `src/test/minioTest.js`:

```javascript
const { minioClient, bucketName } = require('../services/minioService');

async function testMinio() {
  try {
    console.log('🔍 Probando conexión a MinIO...');
    
    // Test 1: Listar buckets
    const buckets = await minioClient.listBuckets();
    console.log('✅ Buckets disponibles:', buckets.map(b => b.name));
    
    // Test 2: Verificar bucket específico
    const exists = await minioClient.bucketExists(bucketName);
    console.log(`✅ Bucket ${bucketName} existe:`, exists);
    
    // Test 3: Listar objetos
    const stream = minioClient.listObjects(bucketName, '', true);
    let count = 0;
    stream.on('data', () => count++);
    stream.on('end', () => {
      console.log(`✅ Total de objetos en ${bucketName}:`, count);
    });
    
  } catch (error) {
    console.error('❌ Error al probar MinIO:', error);
  }
}

testMinio();
```

Ejecutar:
```bash
node src/test/minioTest.js
```

## 📱 Usar en Flutter

En tu app Flutter, las imágenes se cargarán directamente desde MinIO:

```dart
Image.network('https://minpoint.mindtechpy.net/pohapp-images/plantas/imagen.jpg')
```

## 🔄 Migración de imágenes existentes

Si ya tienes imágenes en otro lugar, puedes migrarlas con un script:

```javascript
// src/scripts/migrateImages.js
const fs = require('fs');
const path = require('path');
const { uploadImage } = require('../services/minioService');

async function migrateImages() {
  const imagesDir = './old-images'; // tu directorio actual
  const files = fs.readdirSync(imagesDir);
  
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const buffer = fs.readFileSync(filePath);
    
    const fakeFile = {
      buffer,
      size: buffer.length,
      mimetype: 'image/jpeg', // ajustar según tipo
    };
    
    const filename = `plantas/${file}`;
    const url = await uploadImage(fakeFile, filename);
    console.log(`✅ Migrado: ${file} → ${url}`);
  }
}

migrateImages().catch(console.error);
```

## 📊 Monitoreo

Ver métricas de MinIO:
```bash
kubectl port-forward -n minio svc/minio-console 9001:9001
# Abrir http://localhost:9001 en el navegador
```

Ver logs de MinIO:
```bash
kubectl logs -f deployment/minio -n minio
```

## ✅ Checklist de Integración

- [ ] Secrets de MinIO agregados a GitHub
- [ ] ConfigMap actualizado con configuración de MinIO
- [ ] Workflow actualizado para incluir secrets de MinIO
- [ ] `minioService.js` creado
- [ ] Rutas de upload/delete implementadas
- [ ] multer instalado
- [ ] Bucket `pohapp-images` creado y configurado como público
- [ ] Test de conexión exitoso
- [ ] Imágenes migradas (si aplica)
- [ ] App Flutter apuntando a URLs de MinIO

## 🎉 ¡Integración Completa!

Ahora tu backend puede:
- ✅ Subir imágenes a MinIO
- ✅ Eliminar imágenes de MinIO
- ✅ Listar imágenes almacenadas
- ✅ Servir imágenes públicamente via HTTPS
- ✅ Almacenar hasta 10GB de imágenes (escalable)
