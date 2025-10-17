# 🧪 Plan de Pruebas - Sistema de URLs Firmadas MinIO

## 📋 Checklist de Verificación

### 1️⃣ Verificar Variables de Entorno en Kubernetes

```bash
# Conectar al servidor
ssh andres@192.168.100.221

# Obtener el nombre del pod
POD=$(kubectl get pods -n pohapp-backend -l app=pohapp-backend -o jsonpath='{.items[0].metadata.name}')
echo "Pod: $POD"

# Verificar variables MinIO
kubectl exec -n pohapp-backend $POD -- env | grep MINIO

# Deberías ver:
# MINIO_ACCESS_KEY=DHZQDWzjCFTgViSdkCJ9
# MINIO_SECRET_KEY=WvlfmQMQ4ox5Uczvcqg4iILynL3JasuUDsCHDGR6
# MINIO_BUCKET_NAME=bucket-pohapp
# MINIO_HOST=minio.mindtechpy.net
# MINIO_ENDPOINT=minpoint.mindtechpy.net
# MINIO_REGION=py-east-1
```

---

### 2️⃣ Probar Endpoint Manual de Firma de URLs

#### Prueba Individual:
```bash
curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg" | jq
```

**Respuesta esperada:**
```json
{
  "original": "https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg",
  "signed": "https://minio.mindtechpy.net/bucket-pohapp/1000001009.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  "expiresIn": 86400,
  "objectName": "1000001009.jpg"
}
```

#### Prueba por Lotes:
```bash
curl -X POST "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg",
      "https://minpoint.mindtechpy.net/bucket-pohapp/1000001010.jpg"
    ],
    "expiry": 3600
  }' | jq
```

---

### 3️⃣ Probar Middleware Automático (Pohas)

```bash
# Obtener 2 pohas con imágenes
curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/poha/getindex/0/0/0/0/0?page=0&pageSize=2" | jq '.[0].poha_planta[0].plantum | {nombre, img, img_signed, img_expires_in}'
```

**Respuesta esperada:**
```json
{
  "nombre": "Menta'i",
  "img": "https://minio.mindtechpy.net/bucket-pohapp/1000001009.jpg?X-Amz-Algorithm=...",
  "img_signed": "https://minio.mindtechpy.net/bucket-pohapp/1000001009.jpg?X-Amz-Algorithm=...",
  "img_expires_in": 86400
}
```

---

### 4️⃣ Probar Endpoint Proxy

```bash
# Este endpoint redirige a la URL firmada
curl -L "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/proxy/1000001009.jpg" -o test_image.jpg

# Verificar que la imagen se descargó
file test_image.jpg
# Debería decir: test_image.jpg: JPEG image data

# Ver la imagen
open test_image.jpg  # macOS
```

---

### 5️⃣ Probar en la App Flutter

#### Pasos:
1. Abre la app Flutter
2. Navega a una sección que muestre plantas medicinales
3. Las imágenes deberían cargar correctamente (sin 403)
4. Verifica los logs del backend:

```bash
# En el servidor
kubectl logs -n pohapp-backend -l app=pohapp-backend --tail=50 -f

# Deberías ver logs como:
# 🔗 Generando URL firmada para: 1000001009.jpg
```

---

### 6️⃣ Verificar Logs del Backend

```bash
ssh andres@192.168.100.221

# Ver logs en tiempo real
kubectl logs -n pohapp-backend -l app=pohapp-backend --tail=100 -f

# Buscar errores relacionados con MinIO
kubectl logs -n pohapp-backend -l app=pohapp-backend --tail=500 | grep -i minio

# Buscar errores de firma
kubectl logs -n pohapp-backend -l app=pohapp-backend --tail=500 | grep "Error firmando"
```

---

### 7️⃣ Pruebas de Endpoints Adicionales

#### Plantas Medicinales:
```bash
curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/medicinales?page=0&pageSize=3" | jq '.[0] | {nombre, img, img_signed}'
```

#### Query NLP:
```bash
curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/query-nlp/preview?pregunta=plantas+para+el+dolor+de+cabeza" | jq '.resultados[0].planta | {nombre, img, img_signed}'
```

---

## 🎯 Criterios de Éxito

### ✅ Prueba Exitosa si:
- [ ] Variables MinIO están presentes en el pod
- [ ] Endpoint `/imagenes/signed` devuelve URL firmada válida
- [ ] Endpoint `/imagenes/proxy` redirige y descarga la imagen
- [ ] Las imágenes en `/poha/getindex` vienen firmadas con campos `img_signed` y `img_expires_in`
- [ ] Las URLs firmadas funcionan en el navegador (no dan 403)
- [ ] La app Flutter carga las imágenes correctamente
- [ ] No hay errores en los logs relacionados con MinIO

### ❌ Problemas Comunes:

#### Si las variables no están en el pod:
```bash
# Recrear el secret
kubectl delete secret pohapp-backend-env-secrets -n pohapp-backend
# El workflow de GitHub lo recreará en el próximo despliegue
```

#### Si las URLs no se firman:
- Verificar que el middleware esté aplicado en `config_rutas.js`
- Revisar logs: `kubectl logs -n pohapp-backend -l app=pohapp-backend --tail=100`
- Verificar que `isMinioUrl()` detecte correctamente las URLs

#### Si las URLs firmadas dan 403:
- Verificar credenciales de MinIO: `MINIO_ACCESS_KEY` y `MINIO_SECRET_KEY`
- Verificar que el bucket sea `bucket-pohapp`
- Verificar región: `py-east-1`

---

## 🔄 Después de las Pruebas

### Si todo funciona:
1. Documenta cualquier ajuste necesario
2. Actualiza la documentación de la API
3. Notifica al equipo de Flutter sobre los nuevos campos `img_signed` y `img_expires_in`

### Si algo falla:
1. Captura los logs completos: `kubectl logs -n pohapp-backend -l app=pohapp-backend > backend-logs.txt`
2. Captura la respuesta del endpoint que falla
3. Verifica las variables de entorno
4. Reporta el issue con toda la información

---

## 📱 Integración con Flutter

### Actualización Necesaria en Flutter:

```dart
// Usar img_signed en lugar de img
SafeNetworkImage(
  url: planta.imgSigned ?? planta.img, // Usar URL firmada si existe
  placeholder: AssetImage('assets/placeHolder.png'),
  errorWidget: AssetImage('assets/error.jpg'),
)
```

### Modelo de Datos:
```dart
class Planta {
  final String nombre;
  final String img;           // URL original de MinIO
  final String? imgSigned;    // URL firmada (nueva)
  final int? imgExpiresIn;    // Tiempo de expiración en segundos (nueva)
  
  // Constructor y fromJson...
}
```

---

## 🚀 URLs de Referencia

- **Backend API:** https://back.mindtechpy.net/pohapp/api
- **MinIO Console:** https://minio.mindtechpy.net
- **MinIO Storage:** https://minpoint.mindtechpy.net
- **GitHub Actions:** https://github.com/poravv/remake-api-rest-pohapp/actions
- **Kubernetes Dashboard:** (si está disponible)

---

## 📊 Métricas de Rendimiento

### Tiempo de Firma:
- Individual: < 100ms
- Lote de 10 URLs: < 500ms

### Tiempo de Carga de Imágenes:
- Primera carga (sin caché): 200-500ms
- Con caché (24h): < 50ms

### Logs a Monitorear:
```bash
# Contar firmas generadas en la última hora
kubectl logs -n pohapp-backend -l app=pohapp-backend --tail=10000 | grep "🔗 Generando URL firmada" | wc -l

# Ver últimas URLs firmadas
kubectl logs -n pohapp-backend -l app=pohapp-backend --tail=100 | grep "🔗 Generando URL firmada"
```

---

## 🎓 Comandos Útiles

```bash
# Reiniciar el pod manualmente
kubectl rollout restart deployment/pohapp-backend -n pohapp-backend

# Ver el estado del deployment
kubectl get deployments -n pohapp-backend

# Ver los pods
kubectl get pods -n pohapp-backend -o wide

# Entrar al pod para debugging
kubectl exec -it -n pohapp-backend $POD -- /bin/sh

# Ver secrets (nombres, no valores)
kubectl get secrets -n pohapp-backend

# Describir el secret (sin mostrar valores)
kubectl describe secret pohapp-backend-env-secrets -n pohapp-backend
```

---

**Última actualización:** 17 de octubre de 2025  
**Versión del sistema:** v2.0 - URLs Firmadas MinIO
