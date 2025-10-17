# ⚠️ IMPORTANTE - backend-secrets.yaml

## 🔒 Este archivo NO se usa en producción

**Los valores en `backend-secrets.yaml` son solo EJEMPLOS de plantilla.**

### ✅ Cómo funciona en producción:

Los secrets reales se configuran mediante **GitHub Actions** que lee desde **GitHub Secrets**:

```yaml
# En .github/workflows/deploy.yml
kubectl create secret generic pohapp-backend-env-secrets \
  --from-literal=OPENAI_API_KEY="${{ secrets.OPENAI_API_KEY }}" \
  --from-literal=MINIO_ACCESS_KEY="${{ secrets.MINIO_ACCESS_KEY }}" \
  # ... etc (desde GitHub Secrets)
```

### 📋 Los valores reales están en:

1. **GitHub Secrets**: https://github.com/poravv/remake-api-rest-pohapp/settings/secrets/actions
   - Ahí están los valores REALES de producción
   - GitHub Actions los lee automáticamente en cada deploy

2. **Archivo `.env` local** (gitignored):
   - Para desarrollo local
   - Nunca se sube a GitHub

### 🚫 NUNCA subir secrets reales a GitHub

Este archivo (`backend-secrets.yaml`) con valores de ejemplo:
- ✅ Se puede subir a GitHub (solo tiene placeholders)
- ✅ Sirve como documentación de estructura
- ❌ NO se usa en producción (GitHub Actions lo sobreescribe)

### 🔧 Si necesitas aplicar secrets manualmente:

```bash
# Conectar al servidor
ssh andres@192.168.100.221

# Crear secret con valores reales
kubectl create secret generic pohapp-backend-env-secrets \
  --namespace=pohapp-backend \
  --from-literal=DB_USER="pohapp_user" \
  --from-literal=DB_PASSWORD="tu_password_real_aqui" \
  --from-literal=OPENAI_API_KEY="tu_key_real_aqui" \
  --from-literal=MINIO_ACCESS_KEY="tu_key_real_aqui" \
  --from-literal=MINIO_SECRET_KEY="tu_secret_real_aqui" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 📚 Referencias:

- GitHub Secrets: `docs/GITHUB_SECRETS_CHECKLIST.md`
- Variables locales: `.env` (gitignored)
- Workflow: `.github/workflows/deploy.yml`

---

**Resumen:**
- `backend-secrets.yaml` = 📄 Plantilla/Documentación
- GitHub Secrets = 🔐 Valores reales de producción
- `.env` local = 🔧 Valores de desarrollo (no subir a git)
