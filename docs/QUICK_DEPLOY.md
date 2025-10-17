# 🚀 Despliegue Rápido - URLs Firmadas MinIO

## Pasos para Desplegar (desde tu Mac)

### 1️⃣ Commit y Push al Repositorio

```bash
cd /Users/andresvera/Desktop/Proyectos/pohapp/actual/api-rest-pohapp-main

# Ver cambios
git status

# Agregar todos los archivos nuevos
git add .

# Commit
git commit -m "feat: Implementar sistema de URLs firmadas para MinIO

- Crear servicio minioService.js para generar presigned URLs
- Agregar endpoints /api/pohapp/imagenes/* para firma de URLs
- Implementar middleware signImages para firma automática
- Agregar configuración de MinIO en secrets y configmap
- Documentación completa en docs/MINIO_SIGNED_URLS.md

Resuelve: Imágenes privadas de MinIO no se visualizan (403)
"

# Push a GitHub
git push origin main
```

### 2️⃣ Esperar CI/CD o Desplegar Manualmente

#### Opción A: CI/CD Automático (Recomendado)
```bash
# Monitorear en:
open https://github.com/poravv/remake-api-rest-pohapp/actions

# El workflow de GitHub Actions:
# 1. Build de imagen Docker
# 2. Push a ghcr.io
# 3. Deploy automático a Kubernetes
```

#### Opción B: Deploy Manual
```bash
# Conectar al servidor
ssh andres@192.168.100.221

# Aplicar secrets y configmap
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: pohapp-backend-config
  namespace: pohapp-backend
data:
  NODE_ENV: "production"
  DB_HOST: "mysql-service"
  DB_PORT: "3306"
  DB_DATABASE: "db-pohapp"
  DB_NAME: "db-pohapp"
  MODEL_VERSION: "v20250504"
  MINIO_BUCKET_NAME: "bucket-pohapp"
  MINIO_HOST: "minio.mindtechpy.net"
  MINIO_ENDPOINT: "minpoint.mindtechpy.net"
  MINIO_REGION: "py-east-1"
---
apiVersion: v1
kind: Secret
metadata:
  name: pohapp-backend-env-secrets
  namespace: pohapp-backend
type: Opaque
stringData:
  DB_USER: "pohapp_user"
  DB_PASSWORD: "pohapp_pass_2025_seguro"
  POHAPP_API_SECRET: "your_api_secret_here"
  POHAPP_ADMIN_KEY: "your_admin_key_here"
  OPENAI_API_KEY: "your_openai_key_here"
  MINIO_ACCESS_KEY: "your_minio_access_key_here"
  MINIO_SECRET_KEY: "your_minio_secret_key_here"
EOF

# Reiniciar deployment
kubectl rollout restart deployment/pohapp-backend -n pohapp-backend

# Esperar a que esté listo
kubectl rollout status deployment/pohapp-backend -n pohapp-backend --timeout=5m
```

### 3️⃣ Verificar que Funciona

```bash
# Test 1: Health check
curl -s https://back.mindtechpy.net/pohapp/ && echo "✅ API Online"

# Test 2: Endpoint de firma
curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg" | jq '.signed' && echo "✅ Firma funciona"

# Test 3: URLs automáticas en /poha
curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/poha/getindex/0/0/0/0/0?page=0&pageSize=1" | jq '.[0].poha_planta[0].plantum.img' && echo "✅ Middleware funciona"

# Test 4: Verificar que la URL firmada funciona
SIGNED_URL=$(curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg" | jq -r '.signed')
curl -I "$SIGNED_URL" | head -1 && echo "✅ Imagen accesible"
```

### 4️⃣ Probar en Flutter App

```bash
# Abrir app en simulador/dispositivo
cd /Users/andresvera/Desktop/Proyectos/pohapp/actual/pohapp

# iOS
flutter run -d <ios-device-id>

# Android
flutter run -d <android-device-id>

# Verificar que las imágenes cargan en:
# - Pantalla de lista de remedios
# - Detalle de remedios
# - Búsqueda por IA
```

## 🔍 Comandos de Debugging

### Ver Logs del Backend
```bash
ssh andres@192.168.100.221
kubectl logs -n pohapp-backend -l app=pohapp-backend --tail=50 -f
```

### Ver Variables de Entorno
```bash
POD_NAME=$(kubectl get pods -n pohapp-backend -l app=pohapp-backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n pohapp-backend $POD_NAME -- env | grep -E "MINIO|DB_"
```

### Ver Pods
```bash
kubectl get pods -n pohapp-backend -o wide
```

### Descripción del Deployment
```bash
kubectl describe deployment pohapp-backend -n pohapp-backend
```

### Eventos del Namespace
```bash
kubectl get events -n pohapp-backend --sort-by='.lastTimestamp'
```

## ⚡ Comandos de Rollback

Si algo sale mal:

```bash
# Ver historial de despliegues
kubectl rollout history deployment/pohapp-backend -n pohapp-backend

# Rollback al deployment anterior
kubectl rollout undo deployment/pohapp-backend -n pohapp-backend

# O a una revisión específica
kubectl rollout undo deployment/pohapp-backend -n pohapp-backend --to-revision=2
```

## 📊 Verificación Completa

```bash
# Script todo-en-uno de verificación
ssh andres@192.168.100.221 << 'ENDSSH'
echo "🔍 Verificación del Sistema de URLs Firmadas"
echo ""

echo "1️⃣ Estado del Deployment:"
kubectl get deployment pohapp-backend -n pohapp-backend

echo ""
echo "2️⃣ Pods:"
kubectl get pods -n pohapp-backend -l app=pohapp-backend

echo ""
echo "3️⃣ Variables MinIO:"
POD=$(kubectl get pods -n pohapp-backend -l app=pohapp-backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n pohapp-backend $POD -- env | grep MINIO

echo ""
echo "4️⃣ Test Health:"
curl -s https://back.mindtechpy.net/pohapp/ | head -c 100

echo ""
echo "5️⃣ Test Firma de Imagen:"
curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg" | jq -r '.signed' | head -c 100

echo ""
echo "✅ Verificación Completa"
ENDSSH
```

## 📝 Checklist Post-Deployment

- [ ] ConfigMap aplicado correctamente
- [ ] Secret aplicado correctamente
- [ ] Deployment reiniciado
- [ ] Pods en estado Running
- [ ] Variables MINIO presentes
- [ ] Health check responde 200
- [ ] Endpoint `/imagenes/signed` funciona
- [ ] URLs firmadas en `/poha/getindex`
- [ ] Imagen accesible con URL firmada
- [ ] App Flutter carga imágenes
- [ ] No hay errores en logs

## 🎯 URLs de Prueba

```bash
# Health Check
https://back.mindtechpy.net/pohapp/

# Firma Individual
https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg

# Lista con URLs Firmadas
https://back.mindtechpy.net/pohapp/api/pohapp/poha/getindex/0/0/0/0/0?page=0&pageSize=1

# Proxy
https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/proxy/1000001009.jpg

# Info
https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/info?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg
```

## 🚨 Solución de Problemas Comunes

### "Module not found: minio"
```bash
# Reconstruir imagen Docker con dependencias actualizadas
# GitHub Actions lo hará automáticamente en el próximo push
```

### "Access Denied" en URLs firmadas
```bash
# Verificar credenciales
kubectl get secret pohapp-backend-env-secrets -n pohapp-backend -o yaml
```

### Pods no inician
```bash
# Ver logs de errores
kubectl logs -n pohapp-backend -l app=pohapp-backend --previous
```

### Imágenes no cargan en Flutter
```bash
# Verificar desde el dispositivo
# Abrir en navegador del dispositivo:
https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg
```

---

**¿Necesitas ayuda?**
- Ver logs: `kubectl logs -n pohapp-backend -l app=pohapp-backend -f`
- Documentación: `docs/MINIO_SIGNED_URLS.md`
- Resumen: `docs/MINIO_IMPLEMENTATION_SUMMARY.md`
