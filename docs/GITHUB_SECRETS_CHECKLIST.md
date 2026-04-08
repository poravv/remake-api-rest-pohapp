# ✅ Checklist de GitHub Secrets para MinIO

## 📋 Secrets Requeridos en GitHub

Ir a: `https://github.com/poravv/remake-api-rest-pohapp/settings/secrets/actions`

### Secrets de MinIO (NUEVOS) ⭐

| Secret Name | Valor | Estado |
|------------|-------|--------|
| `MINIO_ACCESS_KEY` | `DHZQDWzjCFTgViSdkCJ9` | ✅ Configurado |
| `MINIO_SECRET_KEY` | `WvlfmQMQ4ox5Uczvcqg4iILynL3JasuUDsCHDGR6` | ✅ Configurado |
| `MINIO_BUCKET_NAME` | `bucket-pohapp` | ✅ Configurado |
| `MINIO_HOST` | `minio.mindtechpy.net` | ✅ Configurado |
| `MINIO_ENDPOINT` | `minpoint.mindtechpy.net` | ✅ Configurado |
| `MINIO_REGION` | `py-east-1` | ✅ Configurado |

### Secrets Existentes (Base de Datos)

| Secret Name | Ejemplo | Estado |
|------------|---------|--------|
| `DB_HOST` | `mysql-service` | ⚠️ Verificar |
| `DB_PORT` | `3306` | ⚠️ Verificar |
| `DB_USER` | `pohapp_user` | ⚠️ Verificar |
| `DB_PASSWORD` | `pohapp_pass_2025_seguro` | ⚠️ Verificar |
| `DB_DATABASE` | `db-pohapp` | ⚠️ Verificar |
| `DB_NAME` | `db-pohapp` | ⚠️ Verificar |

### Secrets Existentes (API)

| Secret Name | Estado |
|------------|--------|
| `POHAPP_API_SECRET` | ⚠️ Verificar |
| `POHAPP_ADMIN_KEY` | ⚠️ Verificar |
| `MODEL_VERSION` | ⚠️ Verificar |
| `OPENAI_API_KEY` | ⚠️ Verificar |

### Secrets de MySQL

| Secret Name | Ejemplo | Estado |
|------------|---------|--------|
| `MYSQL_ROOT_PASSWORD` | `pohapp_root_2025_seguro` | ⚠️ Verificar |
| `MYSQL_USER` | `pohapp_user` | ⚠️ Verificar |
| `MYSQL_PASSWORD` | `pohapp_pass_2025_seguro` | ⚠️ Verificar |
| `MYSQL_DATABASE` | `db-pohapp` | ⚠️ Verificar |

### Secrets de Firebase (NUEVO)

| Secret Name | Descripcion | Estado |
|------------|-------------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Base64-encoded Firebase service account JSON | ⬜ Pendiente |

**Como generar el valor:**

```bash
# 1. Codificar el archivo JSON de la service account en base64
cat pohapp-8f1ab-firebase-adminsdk-1tllf-2ab153afae.json | base64 | pbcopy

# 2. Agregar como GitHub Secret con el nombre FIREBASE_SERVICE_ACCOUNT_JSON
#    El workflow lo decodifica automaticamente durante el deploy
```

> **Nota:** El workflow decodifica el base64 y crea un Kubernetes secret
> `firebase-service-account` que se monta como volumen en el pod del backend
> en la ruta `/etc/firebase/service-account.json`.

### Secrets de GitHub Container Registry

| Secret Name | Estado |
|------------|--------|
| `GHCR_PAT` | ⚠️ Verificar |

## 🔍 Cómo Verificar Secrets en GitHub

```bash
# 1. Ir a la página de secrets
open https://github.com/poravv/remake-api-rest-pohapp/settings/secrets/actions

# 2. Verificar que existan estos secrets (deberías ver 22 secrets en total):
# Base de Datos (6):
#   - DB_HOST
#   - DB_PORT
#   - DB_USER
#   - DB_PASSWORD
#   - DB_DATABASE
#   - DB_NAME
#
# MySQL (4):
#   - MYSQL_ROOT_PASSWORD
#   - MYSQL_USER
#   - MYSQL_PASSWORD
#   - MYSQL_DATABASE
#
# API (4):
#   - POHAPP_API_SECRET
#   - POHAPP_ADMIN_KEY
#   - MODEL_VERSION
#   - OPENAI_API_KEY
#
# MinIO (6): ⭐ NUEVOS
#   - MINIO_ACCESS_KEY
#   - MINIO_SECRET_KEY
#   - MINIO_BUCKET_NAME
#   - MINIO_HOST
#   - MINIO_ENDPOINT
#   - MINIO_REGION
#
# Firebase (1):
#   - FIREBASE_SERVICE_ACCOUNT_JSON
#
# GitHub (1):
#   - GHCR_PAT
```

## 📝 Cómo Agregar/Actualizar Secrets

### Opción 1: Interfaz Web

1. Ir a: https://github.com/poravv/remake-api-rest-pohapp/settings/secrets/actions
2. Click en "New repository secret" o "Update" si ya existe
3. Name: `MINIO_ACCESS_KEY`
4. Secret: `DHZQDWzjCFTgViSdkCJ9`
5. Click "Add secret"
6. Repetir para cada secret de MinIO

### Opción 2: GitHub CLI (gh)

```bash
# Instalar gh CLI si no lo tienes
# macOS: brew install gh
# Autenticar: gh auth login

# Agregar secrets de MinIO
gh secret set MINIO_ACCESS_KEY -b "DHZQDWzjCFTgViSdkCJ9" -R poravv/remake-api-rest-pohapp
gh secret set MINIO_SECRET_KEY -b "WvlfmQMQ4ox5Uczvcqg4iILynL3JasuUDsCHDGR6" -R poravv/remake-api-rest-pohapp
gh secret set MINIO_BUCKET_NAME -b "bucket-pohapp" -R poravv/remake-api-rest-pohapp
gh secret set MINIO_HOST -b "minio.mindtechpy.net" -R poravv/remake-api-rest-pohapp
gh secret set MINIO_ENDPOINT -b "minpoint.mindtechpy.net" -R poravv/remake-api-rest-pohapp
gh secret set MINIO_REGION -b "py-east-1" -R poravv/remake-api-rest-pohapp

# Verificar
gh secret list -R poravv/remake-api-rest-pohapp
```

## 🚀 Flujo de Deployment con Secrets

```
1. git push origin main
   │
2. GitHub Actions detecta push
   │
3. Lee secrets desde GitHub Secrets
   ├── DB_HOST
   ├── DB_PASSWORD
   ├── OPENAI_API_KEY
   ├── MINIO_ACCESS_KEY  ⭐
   ├── MINIO_SECRET_KEY  ⭐
   └── ... (todos los demás)
   │
4. Crea Kubernetes Secret con kubectl create secret
   │
   kubectl create secret generic pohapp-backend-env-secrets \
     --from-literal=MINIO_ACCESS_KEY="${{ secrets.MINIO_ACCESS_KEY }}" \
     --from-literal=MINIO_SECRET_KEY="${{ secrets.MINIO_SECRET_KEY }}" \
     ... (todas las variables)
   │
5. Deployment lee variables desde el Secret
   │
   env:
     - name: MINIO_ACCESS_KEY
       valueFrom:
         secretKeyRef:
           name: pohapp-backend-env-secrets
           key: MINIO_ACCESS_KEY
   │
6. Pod inicia con variables de entorno ✅
   │
7. minioService.js lee:
   process.env.MINIO_ACCESS_KEY
   process.env.MINIO_SECRET_KEY
   │
8. Sistema de URLs firmadas funciona 🎉
```

## 🧪 Cómo Verificar que los Secrets Llegaron al Pod

### Después del deploy, ejecutar:

```bash
# 1. Conectar al servidor
ssh andres@192.168.100.221

# 2. Ver el secret en Kubernetes
kubectl get secret pohapp-backend-env-secrets -n pohapp-backend -o yaml

# 3. Decodificar un valor (ejemplo: MINIO_ACCESS_KEY)
kubectl get secret pohapp-backend-env-secrets -n pohapp-backend -o jsonpath='{.data.MINIO_ACCESS_KEY}' | base64 -d
# Debe mostrar: DHZQDWzjCFTgViSdkCJ9

# 4. Ver variables en el pod
POD_NAME=$(kubectl get pods -n pohapp-backend -l app=pohapp-backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n pohapp-backend $POD_NAME -- env | grep MINIO

# Debe mostrar:
# MINIO_ACCESS_KEY=DHZQDWzjCFTgViSdkCJ9
# MINIO_SECRET_KEY=WvlfmQMQ4ox5Uczvcqg4iILynL3JasuUDsCHDGR6
# MINIO_BUCKET_NAME=bucket-pohapp
# MINIO_HOST=minio.mindtechpy.net
# MINIO_ENDPOINT=minpoint.mindtechpy.net
# MINIO_REGION=py-east-1
```

## ⚠️ Troubleshooting

### Problema: "Secret not found in pod"

**Síntomas:**
```bash
kubectl exec -n pohapp-backend $POD_NAME -- env | grep MINIO
# No muestra nada
```

**Soluciones:**

1. **Verificar que el secret existe:**
```bash
kubectl get secret pohapp-backend-env-secrets -n pohapp-backend
```

2. **Verificar que el deployment referencia el secret:**
```bash
kubectl get deployment pohapp-backend -n pohapp-backend -o yaml | grep secretRef
```

3. **Re-ejecutar workflow:**
```bash
# Hacer un commit vacío para forzar re-deploy
git commit --allow-empty -m "chore: trigger redeploy with MinIO secrets"
git push origin main
```

4. **Aplicar secret manualmente:**
```bash
ssh andres@192.168.100.221
kubectl apply -f k8s/backend-secrets.yaml -n pohapp-backend
kubectl rollout restart deployment/pohapp-backend -n pohapp-backend
```

### Problema: "MinIO connection failed"

**Síntomas:**
```bash
# En logs del pod
Error: connect ECONNREFUSED minio.mindtechpy.net:443
```

**Soluciones:**

1. **Verificar conectividad desde el pod:**
```bash
kubectl exec -n pohapp-backend $POD_NAME -- ping -c 3 minio.mindtechpy.net
kubectl exec -n pohapp-backend $POD_NAME -- curl -I https://minio.mindtechpy.net
```

2. **Verificar credenciales:**
```bash
# Probar conexión con mc (MinIO Client)
kubectl exec -n pohapp-backend $POD_NAME -- sh -c '
  mc alias set myminio https://minio.mindtechpy.net $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
  mc ls myminio/bucket-pohapp
'
```

### Problema: "Invalid credentials"

**Síntomas:**
```bash
# En logs
MinIO Error: The AWS Access Key Id you provided does not exist in our records
```

**Solución:**
```bash
# 1. Verificar que el secret tiene los valores correctos
kubectl get secret pohapp-backend-env-secrets -n pohapp-backend -o jsonpath='{.data.MINIO_ACCESS_KEY}' | base64 -d
kubectl get secret pohapp-backend-env-secrets -n pohapp-backend -o jsonpath='{.data.MINIO_SECRET_KEY}' | base64 -d

# 2. Si son incorrectos, actualizar en GitHub Secrets
# 3. Re-ejecutar workflow
```

## 📊 Verificación Completa Post-Deploy

```bash
#!/bin/bash
echo "🔍 Verificación Completa de Secrets MinIO"
echo "=========================================="
echo ""

# 1. Verificar GitHub Secrets (solo puedes ver si existen, no sus valores)
echo "1️⃣ GitHub Secrets:"
gh secret list -R poravv/remake-api-rest-pohapp | grep MINIO

echo ""
echo "2️⃣ Kubernetes Secret:"
kubectl get secret pohapp-backend-env-secrets -n pohapp-backend

echo ""
echo "3️⃣ Valores en Secret (decodificados):"
echo "MINIO_ACCESS_KEY: $(kubectl get secret pohapp-backend-env-secrets -n pohapp-backend -o jsonpath='{.data.MINIO_ACCESS_KEY}' | base64 -d)"
echo "MINIO_BUCKET_NAME: $(kubectl get secret pohapp-backend-env-secrets -n pohapp-backend -o jsonpath='{.data.MINIO_BUCKET_NAME}' | base64 -d)"
echo "MINIO_HOST: $(kubectl get secret pohapp-backend-env-secrets -n pohapp-backend -o jsonpath='{.data.MINIO_HOST}' | base64 -d)"

echo ""
echo "4️⃣ Variables en Pod:"
POD=$(kubectl get pods -n pohapp-backend -l app=pohapp-backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n pohapp-backend $POD -- env | grep MINIO

echo ""
echo "5️⃣ Test de Conexión a MinIO:"
kubectl exec -n pohapp-backend $POD -- curl -I https://minio.mindtechpy.net 2>&1 | head -2

echo ""
echo "6️⃣ Test de URL Firmada:"
curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg" | jq -r '.signed' | head -c 100

echo ""
echo "✅ Verificación Completa"
```

## 📚 Referencias

- **GitHub Secrets Docs**: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **kubectl create secret**: https://kubernetes.io/docs/concepts/configuration/secret/
- **MinIO SDK**: https://min.io/docs/minio/linux/developers/javascript/API.html

## 🎯 Resumen

### ✅ Lo que configuraste en GitHub Secrets:
```
MINIO_ACCESS_KEY=DHZQDWzjCFTgViSdkCJ9
MINIO_SECRET_KEY=WvlfmQMQ4ox5Uczvcqg4iILynL3JasuUDsCHDGR6
MINIO_BUCKET_NAME=bucket-pohapp
MINIO_HOST=minio.mindtechpy.net
MINIO_ENDPOINT=minpoint.mindtechpy.net
MINIO_REGION=py-east-1
```

### ✅ El workflow ahora:
1. Lee estos secrets de GitHub
2. Los pasa a `kubectl create secret`
3. Kubernetes los monta en el pod como variables de entorno
4. El código Node.js los lee con `process.env.MINIO_*`
5. minioService.js puede conectarse a MinIO
6. Sistema de URLs firmadas funciona ✨

### 🚀 Próximo Paso:
```bash
git add .
git commit -m "feat: Agregar soporte MinIO con URLs firmadas"
git push origin main

# Monitorear deployment
open https://github.com/poravv/remake-api-rest-pohapp/actions
```

---

**Estado:** ✅ GitHub Secrets configurados correctamente
**Workflow:** ✅ Actualizado para pasar secrets a Kubernetes
**Listo para:** 🚀 Deploy automático en próximo push
