# 🚀 Pohapp Backend - Kubernetes Deployment

## 📦 ¿Qué se ha preparado?

Tu proyecto **api-rest-pohapp** ahora tiene todo configurado para desplegarse automáticamente en Kubernetes cada vez que hagas `git push` a la rama `main`.

## 📁 Archivos Creados

```
api-rest-pohapp-main/
├── .github/workflows/
│   └── deploy.yml                    # ✨ CI/CD automático
├── k8s/
│   ├── namespace.yaml                # Namespace pohapp-backend
│   ├── configmap.yaml                # Configuraciones
│   ├── mysql-deployment.yaml         # Base de datos MySQL
│   └── backend-deployment.yaml       # Backend + Ingress + HPA
├── DEPLOYMENT.md                     # 📖 Documentación completa
├── DEPLOYMENT_CHECKLIST.md           # ✅ Checklist paso a paso
├── MINIO_INTEGRATION.md              # 🖼️ Integración con MinIO
├── setup-secrets.sh                  # 🔐 Script para configurar secrets
└── .gitignore                        # Actualizado
```

## 🎯 Próximos Pasos (en orden)

### 1️⃣ Configurar Secrets en GitHub

**Opción Rápida** (Recomendado):
```bash
cd /Users/andresvera/Desktop/Proyectos/pohapp/actual/api-rest-pohapp-main
./setup-secrets.sh
```

El script te pedirá interactivamente todos los valores necesarios.

**Opción Manual**:
Ver archivo `DEPLOYMENT.md` para la lista completa de secrets.

### 2️⃣ Subir Código a GitHub

```bash
cd /Users/andresvera/Desktop/Proyectos/pohapp/actual/api-rest-pohapp-main

git add .
git commit -m "Add Kubernetes deployment with GitHub Actions CI/CD"
git push origin main
```

Esto disparará automáticamente el deployment! 🎉

### 3️⃣ Monitorear el Despliegue

- **GitHub Actions**: https://github.com/TU_USUARIO/api-rest-pohapp/actions
- **Kubernetes**: `kubectl get pods -n pohapp-backend`

### 4️⃣ Configurar DNS

Apunta tu dominio a la IP del Ingress:
```bash
kubectl get ingress -n pohapp-backend
```

### 5️⃣ Actualizar App Flutter

Cambia la URL base en tu app Flutter:
```dart
static const String baseUrl = 'https://api-pohapp.mindtechpy.net';
```

## 🌐 URLs Finales

Una vez desplegado:
- **Backend API**: https://api-pohapp.mindtechpy.net
- **MinIO Console**: https://minio.mindtechpy.net
- **MinIO API**: https://minpoint.mindtechpy.net

## 🔒 Secrets Requeridos (15 total)

### GitHub (1)
- `GHCR_PAT`

### MySQL (4)
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

### Backend (10)
- `DB_HOST` (usar: `mysql-service`)
- `DB_PORT` (usar: `3306`)
- `DB_USER`
- `DB_PASSWORD`
- `DB_DATABASE`
- `DB_NAME`
- `POHAPP_API_SECRET`
- `POHAPP_ADMIN_KEY`
- `MODEL_VERSION`
- `OPENAI_API_KEY`

## ✨ Características Incluidas

- ✅ **CI/CD Automático**: Push a main = deployment automático
- ✅ **MySQL Persistente**: 10GB en Longhorn, datos no se pierden
- ✅ **Alta Disponibilidad**: 2 réplicas mínimas del backend
- ✅ **Auto-escalado**: De 2 a 10 réplicas según carga (HPA)
- ✅ **SSL Automático**: Cert-manager genera certificados Let's Encrypt
- ✅ **Health Checks**: Liveness y Readiness probes configurados
- ✅ **CORS Habilitado**: Para tu app Flutter
- ✅ **Recursos Limitados**: Para prevenir abusos
- ✅ **Rolling Updates**: Sin downtime en actualizaciones
- ✅ **Logs Centralizados**: Fácil debugging
- ✅ **MinIO Ready**: Documentación para integrar almacenamiento de imágenes

## 📚 Documentación

- **`DEPLOYMENT.md`**: Guía completa de deployment
- **`DEPLOYMENT_CHECKLIST.md`**: Checklist paso a paso
- **`MINIO_INTEGRATION.md`**: Cómo integrar MinIO para imágenes

## 🆘 Ayuda Rápida

### Ver logs
```bash
kubectl logs -f deployment/pohapp-backend -n pohapp-backend
```

### Ver estado
```bash
kubectl get all -n pohapp-backend
```

### Reiniciar deployment
```bash
kubectl rollout restart deployment/pohapp-backend -n pohapp-backend
```

### Ver secrets
```bash
kubectl get secrets -n pohapp-backend
```

### Conectar a MySQL
```bash
kubectl exec -it deployment/mysql -n pohapp-backend -- mysql -uroot -p
```

## 🎓 Lo que GitHub Actions hace automáticamente

1. ✅ Ejecuta tests (si existen)
2. ✅ Construye imagen Docker
3. ✅ Sube a GitHub Container Registry
4. ✅ Crea namespace en Kubernetes
5. ✅ Aplica ConfigMaps
6. ✅ Crea Secrets
7. ✅ Despliega MySQL
8. ✅ Espera a que MySQL esté listo
9. ✅ Despliega Backend
10. ✅ Verifica health del backend
11. ✅ Configura Ingress + SSL

Todo esto **sin intervención manual**! 🤖

## 🔥 Diferencias con Deployment Local

| Aspecto | Local | Kubernetes |
|---------|-------|------------|
| Base de datos | Docker local | MySQL persistente |
| Escalabilidad | 1 instancia | 2-10 instancias automático |
| SSL | No | Sí, automático |
| Dominio | localhost:3000 | api-pohapp.mindtechpy.net |
| Disponibilidad | Dependes de tu PC | 24/7 en el cluster |
| Backups | Manual | Automático (Longhorn) |
| Monitoreo | Logs locales | Centralizado en K8s |

## 💡 Tips

- **Primer deployment**: Tarda ~5-10 minutos
- **Updates posteriores**: ~2-3 minutos
- **Si algo falla**: Ver GitHub Actions logs
- **Rollback rápido**: `kubectl rollout undo deployment/pohapp-backend -n pohapp-backend`
- **Ver certificado SSL**: Puede tardar 1-2 minutos después del deployment

## ✅ Checklist Rápido

- [ ] Secrets configurados en GitHub
- [ ] Código pusheado a GitHub
- [ ] GitHub Actions completado
- [ ] Pods corriendo en Kubernetes
- [ ] DNS configurado
- [ ] SSL funcionando
- [ ] Backend respondiendo
- [ ] App Flutter actualizada

## 🎉 ¡Listo!

Una vez completes estos pasos, tu API estará corriendo en producción con todas las mejores prácticas de DevOps! 🚀

---

**¿Preguntas?** Revisa los archivos de documentación detallados:
- `DEPLOYMENT.md` - Guía completa
- `DEPLOYMENT_CHECKLIST.md` - Paso a paso
- `MINIO_INTEGRATION.md` - Almacenamiento de imágenes
