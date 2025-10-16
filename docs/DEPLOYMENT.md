# Pohapp Backend - Kubernetes Deployment

Este proyecto está configurado para despliegue automático en Kubernetes usando GitHub Actions.

## 📋 Requisitos Previos

- Cluster de Kubernetes con Longhorn como StorageClass
- Nginx Ingress Controller instalado
- Cert-Manager para certificados SSL
- GitHub Container Registry (GHCR) habilitado
- GitHub Actions habilitado en el repositorio

## 🔐 Secrets Requeridos en GitHub

Debes configurar los siguientes secrets en tu repositorio de GitHub (Settings → Secrets and variables → Actions):

### 1. GitHub Container Registry
- `GHCR_PAT`: Personal Access Token de GitHub con permisos de `write:packages` y `read:packages`

### 2. Database Configuration (MySQL)
- `MYSQL_ROOT_PASSWORD`: Contraseña del usuario root de MySQL (ej: `pohapp_root_2025`)
- `MYSQL_USER`: Usuario de MySQL (ej: `pohapp_user`)
- `MYSQL_PASSWORD`: Contraseña del usuario MySQL (ej: `pohapp_pass_2025`)
- `MYSQL_DATABASE`: Nombre de la base de datos (ej: `db-pohapp`)

### 3. Application Secrets (Backend)
- `DB_HOST`: Host de la base de datos (usar: `mysql-service`)
- `DB_PORT`: Puerto de MySQL (usar: `3306`)
- `DB_USER`: Usuario para conectar desde la app (mismo que `MYSQL_USER`)
- `DB_PASSWORD`: Contraseña para conectar (mismo que `MYSQL_PASSWORD`)
- `DB_DATABASE`: Base de datos (mismo que `MYSQL_DATABASE`)
- `DB_NAME`: Nombre de la base de datos (mismo que `MYSQL_DATABASE`)
- `POHAPP_API_SECRET`: Clave secreta de la API (ej: `poha_secret_key2025`)
- `POHAPP_ADMIN_KEY`: Clave de administrador (ej: `poha_admin_2025`)
- `MODEL_VERSION`: Versión del modelo (ej: `v20250504`)
- `OPENAI_API_KEY`: API Key de OpenAI (ej: `sk-proj-...`)

## 🚀 Cómo Configurar los Secrets

### Opción 1: Via GitHub Web UI

1. Ve a tu repositorio en GitHub
2. Click en `Settings` → `Secrets and variables` → `Actions`
3. Click en `New repository secret`
4. Agrega cada secret con su valor correspondiente

### Opción 2: Via GitHub CLI

```bash
# Instalar GitHub CLI si no lo tienes
# brew install gh  (macOS)
# apt install gh   (Linux)

# Autenticarte
gh auth login

# Navegar a tu repositorio
cd /Users/andresvera/Desktop/Proyectos/pohapp/actual/api-rest-pohapp-main

# Agregar secrets
gh secret set GHCR_PAT -b "ghp_tu_token_aqui"
gh secret set MYSQL_ROOT_PASSWORD -b "pohapp_root_2025"
gh secret set MYSQL_USER -b "pohapp_user"
gh secret set MYSQL_PASSWORD -b "pohapp_pass_2025"
gh secret set MYSQL_DATABASE -b "db-pohapp"
gh secret set DB_HOST -b "mysql-service"
gh secret set DB_PORT -b "3306"
gh secret set DB_USER -b "pohapp_user"
gh secret set DB_PASSWORD -b "pohapp_pass_2025"
gh secret set DB_DATABASE -b "db-pohapp"
gh secret set DB_NAME -b "db-pohapp"
gh secret set POHAPP_API_SECRET -b "poha_secret_key2025"
gh secret set POHAPP_ADMIN_KEY -b "poha_admin_2025"
gh secret set MODEL_VERSION -b "v20250504"
gh secret set OPENAI_API_KEY -b "tu_api_key_de_openai"
```

## 📦 Estructura del Proyecto

```
api-rest-pohapp-main/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Pipeline CI/CD
├── k8s/
│   ├── namespace.yaml          # Namespace pohapp-backend
│   ├── configmap.yaml          # ConfigMap con configuraciones
│   ├── mysql-deployment.yaml   # MySQL + PVC + Service
│   └── backend-deployment.yaml # Backend + Service + HPA + Ingress
├── src/                        # Código fuente
├── Dockerfile                  # Docker image
└── package.json
```

## 🔄 Proceso de Despliegue

### Automático (GitHub Actions)

Cada vez que hagas `git push` a la rama `main`:

1. ✅ Se ejecutan tests (si existen)
2. 🏗️ Se construye la imagen Docker
3. 📤 Se sube a GitHub Container Registry
4. 🚀 Se despliega en Kubernetes automáticamente

### Manual (desde tu máquina)

Si necesitas desplegar manualmente:

```bash
# 1. Crear namespace
kubectl apply -f k8s/namespace.yaml

# 2. Aplicar configmap
kubectl apply -f k8s/configmap.yaml

# 3. Crear secrets manualmente (solo si no usas GitHub Actions)
kubectl create secret generic pohapp-mysql-secrets \
  --namespace=pohapp-backend \
  --from-literal=mysql-root-password="pohapp_root_2025" \
  --from-literal=mysql-user="pohapp_user" \
  --from-literal=mysql-password="pohapp_pass_2025" \
  --from-literal=mysql-database="db-pohapp"

kubectl create secret generic pohapp-backend-env-secrets \
  --namespace=pohapp-backend \
  --from-literal=DB_HOST="mysql-service" \
  --from-literal=DB_PORT="3306" \
  --from-literal=DB_USER="pohapp_user" \
  --from-literal=DB_PASSWORD="pohapp_pass_2025" \
  --from-literal=DB_DATABASE="db-pohapp" \
  --from-literal=DB_NAME="db-pohapp" \
  --from-literal=NODE_ENV="production" \
  --from-literal=PORT="3000" \
  --from-literal=POHAPP_API_SECRET="poha_secret_key2025" \
  --from-literal=POHAPP_ADMIN_KEY="poha_admin_2025" \
  --from-literal=MODEL_VERSION="v20250504" \
  --from-literal=OPENAI_API_KEY="tu_api_key"

# 4. Desplegar MySQL
kubectl apply -f k8s/mysql-deployment.yaml

# 5. Esperar a que MySQL esté listo
kubectl wait --for=condition=ready pod -l app=mysql -n pohapp-backend --timeout=300s

# 6. Desplegar backend
kubectl apply -f k8s/backend-deployment.yaml

# 7. Verificar estado
kubectl get pods -n pohapp-backend
kubectl get svc -n pohapp-backend
kubectl get ingress -n pohapp-backend
```

## 🌐 URLs de Acceso

- **API Backend**: https://api-pohapp.mindtechpy.net
- **Consola MinIO**: https://minio.mindtechpy.net
- **API MinIO**: https://minpoint.mindtechpy.net

## 🔍 Monitoreo y Logs

```bash
# Ver pods
kubectl get pods -n pohapp-backend

# Ver logs del backend
kubectl logs -f deployment/pohapp-backend -n pohapp-backend

# Ver logs de MySQL
kubectl logs -f deployment/mysql -n pohapp-backend

# Ejecutar comando en MySQL
kubectl exec -it deployment/mysql -n pohapp-backend -- mysql -uroot -p

# Ver métricas de HPA
kubectl get hpa -n pohapp-backend

# Ver eventos
kubectl get events -n pohapp-backend --sort-by='.lastTimestamp'
```

## 🛠️ Troubleshooting

### El backend no se conecta a MySQL
```bash
# Verificar que MySQL esté corriendo
kubectl get pods -n pohapp-backend -l app=mysql

# Ver logs de MySQL
kubectl logs deployment/mysql -n pohapp-backend

# Probar conexión desde dentro del pod backend
kubectl exec -it deployment/pohapp-backend -n pohapp-backend -- sh
# Dentro del pod:
nc -zv mysql-service 3306
```

### Error de imagen no encontrada
```bash
# Verificar que el secret de GHCR esté creado
kubectl get secret ghcr-secret -n pohapp-backend

# Re-crear el secret
kubectl delete secret ghcr-secret -n pohapp-backend
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=tu_usuario \
  --docker-password=tu_GHCR_PAT \
  --namespace=pohapp-backend
```

### Ver detalles de un pod que falla
```bash
kubectl describe pod <nombre-pod> -n pohapp-backend
kubectl logs <nombre-pod> -n pohapp-backend --previous
```

## 🔒 Seguridad

- ✅ Todos los secrets se manejan via Kubernetes Secrets
- ✅ SSL/TLS automático via cert-manager
- ✅ Base de datos solo accesible dentro del cluster (ClusterIP)
- ✅ CORS configurado en el Ingress
- ✅ Límites de recursos configurados para evitar abusos

## 📊 Escalado

El HPA (Horizontal Pod Autoscaler) está configurado para:
- **Mínimo**: 2 réplicas (alta disponibilidad)
- **Máximo**: 10 réplicas
- **Trigger**: 70% CPU o 80% memoria

## 🔄 Actualización Manual

Si necesitas forzar una actualización:

```bash
# Reiniciar el deployment
kubectl rollout restart deployment/pohapp-backend -n pohapp-backend

# Ver estado del rollout
kubectl rollout status deployment/pohapp-backend -n pohapp-backend

# Rollback si algo sale mal
kubectl rollout undo deployment/pohapp-backend -n pohapp-backend
```

## 📝 Notas Importantes

1. **Persistencia**: MySQL usa Longhorn PVC de 10GB, los datos persisten entre reinicios
2. **Alta disponibilidad**: El backend tiene 2 réplicas mínimas
3. **Health checks**: Configurados tanto liveness como readiness probes
4. **Recursos**: Configurados requests y limits para evitar problemas de scheduling
5. **Ingress**: Configurado con SSL automático y CORS habilitado

## 🆘 Soporte

Para problemas o preguntas, revisar:
- Logs del deployment: `kubectl logs -f deployment/pohapp-backend -n pohapp-backend`
- GitHub Actions: Ver el último workflow run en la pestaña Actions
- Eventos de Kubernetes: `kubectl get events -n pohapp-backend`
