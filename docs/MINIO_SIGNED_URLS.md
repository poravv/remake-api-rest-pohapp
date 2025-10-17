# 🖼️ Sistema de URLs Firmadas para MinIO

## 📋 Problema Resuelto

Las imágenes almacenadas en MinIO estaban configuradas con bucket privado (Access Denied 403), lo que impedía que la app Flutter pudiera cargarlas directamente.

## 🛠️ Solución Implementada

Se implementó un sistema completo de URLs firmadas (presigned URLs) que genera URLs temporales con acceso autenticado.

## 🏗️ Arquitectura

```
┌─────────────┐
│ Flutter App │
└──────┬──────┘
       │ GET /api/pohapp/poha/getindex
       ▼
┌──────────────────┐
│ Backend API      │
│ + signMinioUrls  │ ◄─── Middleware firma automáticamente
└──────┬───────────┘
       │
       ├─► 1. Consulta MySQL
       │   └─► Obtiene datos con URLs de MinIO
       │
       ├─► 2. Detecta URLs de MinIO
       │   └─► Busca campos: img, imagen, image
       │
       ├─► 3. Genera URL firmada
       │   └─► MinIO.presignedGetObject()
       │
       └─► 4. Responde con URLs firmadas
           └─► URLs válidas por 24 horas
```

## 📁 Archivos Creados

### 1. **Servicio MinIO** (`src/services/minioService.js`)
Funciones para interactuar con MinIO:
- `getPresignedUrl(objectName, expiry)` - Genera URL firmada individual
- `getPresignedUrls(urls, expiry)` - Genera URLs firmadas en batch
- `extractObjectName(url)` - Extrae nombre del objeto desde URL
- `isMinioUrl(url)` - Verifica si es URL de MinIO
- `uploadImage()` - Sube imágenes
- `deleteImage()` - Elimina imágenes
- `listImages()` - Lista objetos

### 2. **Rutas de Imágenes** (`src/routes/ruta_imagenes.js`)
Endpoints específicos para manejar imágenes:

#### `GET /api/pohapp/imagenes/signed`
Genera URL firmada para una imagen específica.

**Query Params:**
- `url` (requerido): URL original de MinIO
- `expiry` (opcional): Tiempo de expiración en segundos (default: 86400 = 24h)

**Ejemplo:**
```bash
curl "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg"
```

**Respuesta:**
```json
{
  "original": "https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg",
  "signed": "https://minio.mindtechpy.net/bucket-pohapp/1000001009.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "objectName": "1000001009.jpg",
  "expiresIn": 86400,
  "isMinioUrl": true
}
```

#### `POST /api/pohapp/imagenes/signed-batch`
Genera URLs firmadas para múltiples imágenes.

**Body:**
```json
{
  "urls": [
    "https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg",
    "https://minpoint.mindtechpy.net/bucket-pohapp/genjibre.jpeg"
  ],
  "expiry": 86400
}
```

**Respuesta:**
```json
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "original": "https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg",
      "signed": "https://minio.mindtechpy.net/..."
    },
    {
      "original": "https://minpoint.mindtechpy.net/bucket-pohapp/genjibre.jpeg",
      "signed": "https://minio.mindtechpy.net/..."
    }
  ],
  "expiresIn": 86400
}
```

#### `GET /api/pohapp/imagenes/proxy/*`
Redirige a una URL firmada (útil para HTML/CSS).

**Ejemplo:**
```html
<img src="https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/proxy/1000001009.jpg">
```

### 3. **Middleware** (`src/middleware/signImages.js`)
Middleware que firma automáticamente todas las URLs de MinIO en las respuestas.

**Funciona en:**
- `/api/pohapp/poha/*` (lista de remedios)
- `/api/pohapp/medicinales/*` (medicina tradicional)
- `/api/pohapp/query-nlp/*` (búsquedas IA)

**Campos detectados automáticamente:**
- `img`
- `imagen`
- `image`
- `imageUrl`
- `photo`
- `picture`

**Resultado:**
```json
{
  "idplanta": 11,
  "nombre": "Menta'i",
  "img_original": "https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg",
  "img": "https://minio.mindtechpy.net/bucket-pohapp/1000001009.jpg?X-Amz-Algorithm=...",
  "img_signed": "https://minio.mindtechpy.net/bucket-pohapp/1000001009.jpg?X-Amz-Algorithm=...",
  "img_expires_in": 86400
}
```

## 🔧 Configuración

### Variables de Entorno (.env)
```bash
# Configuración de MinIO
MINIO_ACCESS_KEY=DHZQDWzjCFTgViSdkCJ9
MINIO_SECRET_KEY=WvlfmQMQ4ox5Uczvcqg4iILynL3JasuUDsCHDGR6
MINIO_BUCKET_NAME=bucket-pohapp
MINIO_HOST=minio.mindtechpy.net
MINIO_ENDPOINT=minpoint.mindtechpy.net
MINIO_REGION=py-east-1
```

### Kubernetes ConfigMap/Secret
Agregar las variables de entorno al deployment:

```yaml
env:
  - name: MINIO_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: pohapp-secrets
        key: minio-access-key
  - name: MINIO_SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: pohapp-secrets
        key: minio-secret-key
  - name: MINIO_BUCKET_NAME
    value: "bucket-pohapp"
  - name: MINIO_HOST
    value: "minio.mindtechpy.net"
  - name: MINIO_ENDPOINT
    value: "minpoint.mindtechpy.net"
  - name: MINIO_REGION
    value: "py-east-1"
```

## 🚀 Uso en Flutter

### Opción 1: Automático (Recomendado)
El middleware firma automáticamente las URLs, no necesitas cambiar nada en Flutter:

```dart
// Las URLs ya vienen firmadas desde el backend
SafeNetworkImage(
  imageUrl: planta.img, // Ya viene firmada
  width: 100,
  height: 100,
  fit: BoxFit.cover,
)
```

### Opción 2: Manual
Si necesitas firmar una URL manualmente:

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<String> getSignedUrl(String minioUrl) async {
  final response = await http.get(
    Uri.parse('${ApiConfig.baseUrl}/imagenes/signed?url=$minioUrl'),
  );
  
  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return data['signed'];
  }
  
  return minioUrl; // Fallback a URL original
}

// Uso
final signedUrl = await getSignedUrl(planta.img);
```

### Opción 3: Proxy
Usar el endpoint proxy para redireccionamiento:

```dart
String getProxyUrl(String minioUrl) {
  final objectName = minioUrl.split('/').last;
  return '${ApiConfig.baseUrl}/imagenes/proxy/$objectName';
}
```

## 📊 Endpoints Afectados

Los siguientes endpoints ahora devuelven URLs firmadas automáticamente:

1. **GET /api/pohapp/poha/getindex/:params**
   - Firma imágenes de plantas en `poha_planta[].plantum.img`

2. **GET /api/pohapp/poha/get/:idpoha**
   - Firma imágenes en detalle de remedios

3. **GET /api/pohapp/medicinales/get/**
   - Firma imágenes de vista `vw_medicina`

4. **POST /api/pohapp/query-nlp/explica**
   - Firma imágenes en respuestas de IA

5. **POST /api/pohapp/query-nlp/preview**
   - Firma imágenes en búsquedas semánticas

## 🔍 Debugging

### Verificar si una URL está firmada
```bash
# URL sin firmar (403)
curl -I "https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg"
# HTTP/2 403 - Access Denied

# URL firmada (200)
curl -I "https://minio.mindtechpy.net/bucket-pohapp/1000001009.jpg?X-Amz-Algorithm=..."
# HTTP/2 200 OK
```

### Probar endpoint de firma
```bash
curl "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg"
```

### Ver logs del middleware
```bash
kubectl logs -n pohapp-backend -l app=pohapp-backend --tail=100 | grep "firmada"
```

## ⏱️ Tiempo de Expiración

Las URLs firmadas son válidas por:
- **Default**: 24 horas (86400 segundos)
- **Configurable**: Puedes cambiar el tiempo con el parámetro `expiry`

**Ejemplo con 1 hora:**
```bash
curl "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=...&expiry=3600"
```

## 🔒 Seguridad

### Ventajas
✅ Las credenciales de MinIO nunca se exponen al cliente
✅ URLs temporales que expiran automáticamente
✅ Control granular sobre acceso a objetos
✅ Auditoría completa en logs de MinIO

### Consideraciones
⚠️ Las URLs firmadas son válidas hasta que expiren
⚠️ Cualquiera con la URL puede acceder hasta la expiración
⚠️ Generar URLs tiene un pequeño overhead (< 50ms)

## 📈 Performance

### Caché de URLs Firmadas (Futuro)
Para mejorar performance, se puede implementar caché:

```javascript
const urlCache = new Map();

const getCachedPresignedUrl = async (objectName) => {
  const cacheKey = objectName;
  const cached = urlCache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }
  
  const url = await getPresignedUrl(objectName);
  urlCache.set(cacheKey, {
    url,
    expires: Date.now() + (86400 * 1000), // 24h
  });
  
  return url;
};
```

## 🧪 Testing

### Prueba local
```bash
# 1. Iniciar backend
cd api-rest-pohapp-main
npm start

# 2. Probar endpoint
curl "http://localhost:3000/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg"

# 3. Verificar respuesta
# Debe devolver un objeto con "signed" conteniendo la URL firmada
```

### Prueba en producción
```bash
# 1. Verificar que el pod tenga las variables de entorno
kubectl exec -n pohapp-backend $(kubectl get pods -n pohapp-backend -l app=pohapp-backend -o jsonpath='{.items[0].metadata.name}') -- env | grep MINIO

# 2. Probar endpoint
curl "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg"

# 3. Verificar que /poha/getindex devuelva URLs firmadas
curl "https://back.mindtechpy.net/pohapp/api/pohapp/poha/getindex/0/0/0/0/0?page=0&pageSize=1" | jq '.[] | .poha_planta[].plantum | {nombre, img_original, img}'
```

## 🔄 Migración

### Datos Existentes
No es necesario migrar las URLs en la base de datos. El sistema funciona con las URLs existentes:

1. La URL original se mantiene en la BD: `https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg`
2. El middleware detecta que es una URL de MinIO
3. Genera URL firmada automáticamente
4. Respuesta incluye ambas (original y firmada)

### Rollback
Si necesitas desactivar el sistema:

1. Comentar el middleware en `config_rutas.js`:
```javascript
// routes.use('/api/pohapp/poha', signMinioUrls, poha)
routes.use('/api/pohapp/poha', poha)
```

2. Las URLs originales seguirán funcionando si haces el bucket público en MinIO

## 📝 Notas Adicionales

- Las URLs firmadas incluyen firma HMAC-SHA256 para validación
- MinIO usa AWS S3 signature v4 compatible
- El middleware es opt-in por ruta (no afecta todas las respuestas)
- Puedes usar `?signImages=true` para forzar firma en cualquier endpoint

## 🆘 Troubleshooting

### Error: "Access Denied" al generar URL
- Verificar credenciales de MinIO en `.env`
- Verificar que el bucket existe
- Verificar permisos del usuario de MinIO

### Las imágenes no cargan en Flutter
- Verificar que la respuesta incluya campo `img_signed`
- Verificar que la URL firmada no haya expirado (< 24h)
- Verificar conectividad a minio.mindtechpy.net desde el dispositivo

### URLs firmadas muy largas
- Es normal, las URLs firmadas incluyen parámetros de autenticación
- Longitud típica: 300-500 caracteres
- No afecta performance de la app

## 📚 Referencias

- [MinIO JavaScript Client API](https://min.io/docs/minio/linux/developers/javascript/API.html)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html)
