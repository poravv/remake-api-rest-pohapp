# Arquitectura Pohapp - Kubernetes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INTERNET / USUARIOS                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DNS (Cloudflare, etc.)                          │
│                                                                          │
│  api-pohapp.mindtechpy.net     → Nginx Ingress                         │
│  minio.mindtechpy.net          → MinIO Console                         │
│  minpoint.mindtechpy.net       → MinIO API                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      NGINX INGRESS CONTROLLER                            │
│                                                                          │
│  • TLS Termination (Let's Encrypt)                                      │
│  • Load Balancing                                                       │
│  • CORS Configuration                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
      ┌─────────────┴────────────┐        ┌───────┴──────────┐
      ▼                          ▼        ▼                  ▼
┌──────────────┐         ┌─────────────────────┐    ┌──────────────────┐
│              │         │                     │    │                  │
│   MinIO      │         │  Pohapp Backend     │    │  MinIO Console   │
│   (API)      │         │     Service         │    │                  │
│              │         │   (ClusterIP)       │    │  (ClusterIP)     │
│  Port: 9000  │         │    Port: 3000       │    │   Port: 9001     │
│              │         │                     │    │                  │
└──────────────┘         └─────────────────────┘    └──────────────────┘
      │                            │
      │                            ▼
      │                  ┌──────────────────────┐
      │                  │ HorizontalPodScaler  │
      │                  │   (HPA)              │
      │                  │  Min: 2, Max: 10     │
      │                  └──────────────────────┘
      │                            │
      │                            ▼
      │           ┌────────────────┴────────────────┐
      │           │                                 │
      │      ┌────▼────┐   ┌────────┐   ┌────────┐│
      │      │ Backend │   │ Backend│   │ Backend││
      │      │  Pod 1  │   │  Pod 2 │   │  Pod N ││
      │      │         │   │        │   │  (...)  │
      │      └────┬────┘   └────┬───┘   └────┬───┘│
      │           │             │             │    │
      │           └─────────────┴─────────────┘    │
      │                         │                  │
      │                         ▼                  │
      │                ┌──────────────────┐        │
      │                │  MySQL Service   │        │
      │                │   (ClusterIP)    │        │
      │                │   Port: 3306     │        │
      │                └────────┬─────────┘        │
      │                         │                  │
      │                         ▼                  │
      │                    ┌─────────┐             │
      │                    │  MySQL  │             │
      │                    │   Pod   │             │
      │                    └────┬────┘             │
      │                         │                  │
      │                         ▼                  │
      │              ┌──────────────────┐          │
      │              │  MySQL PVC       │          │
      │              │  (Longhorn)      │          │
      │              │   10 GB          │          │
      │              └──────────────────┘          │
      │                                            │
      └──────────────────▼─────────────────────────┘
                    ┌─────────┐
                    │  MinIO  │
                    │   Pod   │
                    └────┬────┘
                         │
                         ▼
              ┌──────────────────┐
              │  MinIO PVC       │
              │  (Longhorn)      │
              │   10 GB          │
              └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        PERSISTENT STORAGE                                │
│                          (Longhorn)                                      │
│                                                                          │
│  • MySQL Data: 10 GB                                                    │
│  • MinIO Data: 10 GB                                                    │
│  • Auto Backup & Replication                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                │
│                                                                          │
│  • OpenAI API (GPT-4/3.5)      → Model inference                        │
│  • Let's Encrypt               → SSL Certificates                       │
│  • GitHub Container Registry   → Docker Images                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            CI/CD PIPELINE                                │
│                         (GitHub Actions)                                 │
│                                                                          │
│  1. git push origin main                                                │
│  2. Run tests                                                           │
│  3. Build Docker image                                                  │
│  4. Push to GHCR                                                        │
│  5. Deploy to Kubernetes                                                │
│  6. Health checks                                                       │
│  7. ✅ Deployment complete                                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          NAMESPACES                                      │
│                                                                          │
│  • pohapp-backend   → Backend + MySQL                                   │
│  • minio            → MinIO (storage)                                   │
│  • ingress-nginx    → Ingress Controller                                │
│  • cert-manager     → SSL Management                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                                   │
│                                                                          │
│  ✓ Kubernetes Secrets (encrypted at rest)                              │
│  ✓ TLS/SSL (Let's Encrypt)                                             │
│  ✓ Network Policies (ClusterIP services)                               │
│  ✓ RBAC (Role-Based Access Control)                                    │
│  ✓ Resource Limits (CPU/Memory)                                        │
│  ✓ Image Pull Secrets (GHCR)                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      MONITORING & OBSERVABILITY                          │
│                                                                          │
│  • kubectl logs                → Application logs                       │
│  • kubectl top                 → Resource usage                         │
│  • kubectl describe            → Detailed status                        │
│  • GitHub Actions              → CI/CD logs                             │
│  • Kubernetes Events           → Cluster events                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                               │
│                                                                          │
│  📱 Flutter App (Android/iOS)                                           │
│     ↓                                                                   │
│     https://api-pohapp.mindtechpy.net                                  │
│     ↓                                                                   │
│     Backend API (REST)                                                  │
│     ↓                                                                   │
│     MySQL (Data) + MinIO (Images) + OpenAI (AI)                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### 1. Usuario hace una consulta en la App Flutter
```
Flutter App → HTTPS Request → Nginx Ingress → Backend Pod → MySQL
                                              ↓
                                         OpenAI API
                                              ↓
                                          Response
                                              ↓
                                         Flutter App
```

### 2. Usuario sube una imagen
```
Flutter App → Multipart Upload → Backend Pod → MinIO
                                              ↓
                                          URL generada
                                              ↓
                                     Guardada en MySQL
                                              ↓
                                         Flutter App
```

### 3. CI/CD Automático
```
Developer → git push → GitHub Actions → Build Docker Image
                                       ↓
                                   Push to GHCR
                                       ↓
                              Deploy to Kubernetes
                                       ↓
                              Health Check
                                       ↓
                            ✅ Production Ready
```

## Escalado Automático (HPA)

```
CPU > 70% ──┐
            ├──→ Escalar UP (hasta 10 pods)
Memory > 80%┘

CPU < 50% ──┐
            ├──→ Escalar DOWN (mínimo 2 pods)
Memory < 60%┘
```

## Recursos por Componente

| Componente | Requests | Limits | Réplicas |
|------------|----------|--------|----------|
| Backend    | 512Mi/250m | 1Gi/1000m | 2-10 |
| MySQL      | 1Gi/250m | 2Gi/1000m | 1 |
| MinIO      | 512Mi/250m | 2Gi/1000m | 1 |

## Storage

| Componente | Tamaño | StorageClass | Backup |
|------------|--------|--------------|--------|
| MySQL      | 10 GB  | Longhorn     | Auto   |
| MinIO      | 10 GB  | Longhorn     | Auto   |
