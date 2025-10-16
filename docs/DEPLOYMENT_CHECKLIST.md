# Checklist de Despliegue - Pohapp Backend

## ✅ Pre-requisitos

- [ ] Cluster de Kubernetes accesible
- [ ] `kubectl` configurado y funcionando
- [ ] Longhorn instalado como StorageClass
- [ ] Nginx Ingress Controller instalado
- [ ] Cert-Manager configurado con `letsencrypt-prod`
- [ ] GitHub Container Registry habilitado
- [ ] Repositorio en GitHub con nombre en lowercase

## 📝 Paso 1: Configurar Secrets en GitHub

### Opción A: Script Automático (Recomendado)
```bash
cd /Users/andresvera/Desktop/Proyectos/pohapp/actual/api-rest-pohapp-main
./setup-secrets.sh
```

### Opción B: Manual via GitHub CLI
```bash
gh secret set GHCR_PAT -b "tu_token_aqui"
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
gh secret set OPENAI_API_KEY -b "sk-proj-..."
```

- [ ] Todos los secrets configurados

## 📦 Paso 2: Verificar Archivos de Configuración

- [ ] `.github/workflows/deploy.yml` existe
- [ ] `k8s/namespace.yaml` existe
- [ ] `k8s/configmap.yaml` existe
- [ ] `k8s/mysql-deployment.yaml` existe
- [ ] `k8s/backend-deployment.yaml` existe
- [ ] `Dockerfile` optimizado
- [ ] `.gitignore` actualizado

## 🚀 Paso 3: Subir Código a GitHub

```bash
cd /Users/andresvera/Desktop/Proyectos/pohapp/actual/api-rest-pohapp-main

# Verificar estado
git status

# Agregar archivos nuevos
git add .github/
git add k8s/
git add DEPLOYMENT.md
git add setup-secrets.sh
git add .gitignore

# Commit
git commit -m "Add Kubernetes deployment with GitHub Actions CI/CD"

# Push (esto disparará el deployment automático)
git push origin main
```

- [ ] Código subido a GitHub
- [ ] GitHub Actions iniciado automáticamente

## 🔍 Paso 4: Monitorear Despliegue

### Ver GitHub Actions
```bash
# En el navegador
https://github.com/TU_USUARIO/api-rest-pohapp/actions
```

- [ ] Job "Test Backend" completado ✅
- [ ] Job "Build and Deploy" completado ✅

### Ver en Kubernetes
```bash
# Ver namespace
kubectl get ns pohapp-backend

# Ver pods
kubectl get pods -n pohapp-backend

# Ver servicios
kubectl get svc -n pohapp-backend

# Ver ingress
kubectl get ingress -n pohapp-backend
```

- [ ] Namespace creado
- [ ] MySQL pod corriendo (1/1 Ready)
- [ ] Backend pods corriendo (2/2 Ready)
- [ ] Servicios creados
- [ ] Ingress configurado

## 🏥 Paso 5: Verificar Health

### MySQL
```bash
# Ver logs
kubectl logs -f deployment/mysql -n pohapp-backend

# Conectar a MySQL
kubectl exec -it deployment/mysql -n pohapp-backend -- mysql -uroot -p
# Ingresar contraseña cuando pida
```

- [ ] MySQL aceptando conexiones
- [ ] Base de datos creada

### Backend
```bash
# Ver logs
kubectl logs -f deployment/pohapp-backend -n pohapp-backend

# Probar endpoint
curl https://api-pohapp.mindtechpy.net
```

- [ ] Backend corriendo sin errores
- [ ] Conectado a MySQL
- [ ] Endpoint principal responde

## 🌐 Paso 6: Configurar DNS

### En tu proveedor de DNS (Cloudflare, Route53, etc.)
```
Tipo: A
Nombre: api-pohapp
Valor: <IP_DE_TU_INGRESS>
TTL: 300
```

Para obtener la IP del Ingress:
```bash
kubectl get ingress -n pohapp-backend -o wide
```

- [ ] DNS configurado
- [ ] Propagación DNS completada (puede tardar hasta 48h)
- [ ] Certificado SSL emitido (ver con `kubectl get certificate -n pohapp-backend`)

## 🔒 Paso 7: Verificar SSL

```bash
# Ver certificados
kubectl get certificate -n pohapp-backend

# Ver detalles
kubectl describe certificate pohapp-backend-tls -n pohapp-backend
```

- [ ] Certificado en estado "Ready"
- [ ] HTTPS funcionando: https://api-pohapp.mindtechpy.net

## 📊 Paso 8: Verificar HPA (Auto-escalado)

```bash
kubectl get hpa -n pohapp-backend
```

- [ ] HPA configurado
- [ ] Réplicas entre 2-10 según carga

## ✅ Paso 9: Pruebas Finales

### Test básico
```bash
curl https://api-pohapp.mindtechpy.net
```

### Test con datos (ajusta según tus endpoints)
```bash
# Ejemplo: listar plantas
curl https://api-pohapp.mindtechpy.net/api/pohapp/planta/get

# Ejemplo: query IA
curl -X POST https://api-pohapp.mindtechpy.net/api/pohapp/query-nlp/explica \
  -H "Content-Type: application/json" \
  -d '{"pregunta":"¿Qué planta ayuda con la gripe?","idusuario":"test123"}'
```

- [ ] Endpoints básicos funcionando
- [ ] Integración con OpenAI funcionando
- [ ] Consultas a MySQL funcionando

## 🔄 Paso 10: Configurar App Flutter

En tu app Flutter, actualiza la URL base de la API:

```dart
// En tu config/api_config.dart o similar
static const String baseUrl = 'https://api-pohapp.mindtechpy.net';
```

- [ ] App Flutter apuntando a nuevo backend
- [ ] App probada en producción

## 📝 Troubleshooting

### Si algo falla:

1. **Ver logs de GitHub Actions**
   ```
   https://github.com/TU_USUARIO/api-rest-pohapp/actions
   ```

2. **Ver logs de pods**
   ```bash
   kubectl logs -f deployment/pohapp-backend -n pohapp-backend
   kubectl logs -f deployment/mysql -n pohapp-backend
   ```

3. **Ver eventos**
   ```bash
   kubectl get events -n pohapp-backend --sort-by='.lastTimestamp'
   ```

4. **Describir recursos**
   ```bash
   kubectl describe pod <nombre-pod> -n pohapp-backend
   kubectl describe deployment pohapp-backend -n pohapp-backend
   ```

5. **Verificar secrets**
   ```bash
   kubectl get secrets -n pohapp-backend
   ```

## 🎉 ¡Deployment Completado!

Si todos los checkmarks están marcados, tu API está corriendo en producción:

- ✅ Backend: https://api-pohapp.mindtechpy.net
- ✅ MySQL: Persistente en Longhorn (10GB)
- ✅ SSL: Automático via cert-manager
- ✅ Auto-escalado: 2-10 réplicas
- ✅ Alta disponibilidad: 2 réplicas mínimas
- ✅ CI/CD: Automático en cada push a main

## 📞 Soporte

- **Logs**: `kubectl logs -f deployment/pohapp-backend -n pohapp-backend`
- **Status**: `kubectl get all -n pohapp-backend`
- **GitHub Actions**: Ver en la pestaña Actions de tu repo
