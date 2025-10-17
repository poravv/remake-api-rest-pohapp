#!/bin/bash

# Script para actualizar el backend con soporte de URLs firmadas de MinIO
# Ejecutar desde el servidor k8s-master

set -e

echo "🚀 Actualizando Pohapp Backend con soporte MinIO..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Namespace
NAMESPACE="pohapp-backend"

echo ""
echo "${YELLOW}📦 Paso 1: Aplicando ConfigMap y Secrets...${NC}"
kubectl apply -f k8s/backend-secrets.yaml

echo ""
echo "${YELLOW}🔄 Paso 2: Reiniciando deployment para cargar nuevas variables...${NC}"
kubectl rollout restart deployment/pohapp-backend -n $NAMESPACE

echo ""
echo "${YELLOW}⏳ Paso 3: Esperando a que el deployment esté listo...${NC}"
kubectl rollout status deployment/pohapp-backend -n $NAMESPACE --timeout=5m

echo ""
echo "${YELLOW}🔍 Paso 4: Verificando variables de entorno de MinIO...${NC}"
POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=pohapp-backend -o jsonpath='{.items[0].metadata.name}')
echo "Pod: $POD_NAME"
kubectl exec -n $NAMESPACE $POD_NAME -- env | grep MINIO || echo "❌ Variables MINIO no encontradas"

echo ""
echo "${YELLOW}🧪 Paso 5: Probando endpoint de imágenes firmadas...${NC}"
sleep 5  # Dar tiempo para que el pod esté completamente listo

# Test 1: Health check
echo "Test 1: Health check..."
curl -s -o /dev/null -w "%{http_code}" https://back.mindtechpy.net/pohapp/ && echo " ✅"

# Test 2: Endpoint de firma de imágenes
echo "Test 2: Endpoint de firma..."
RESPONSE=$(curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/imagenes/signed?url=https://minpoint.mindtechpy.net/bucket-pohapp/1000001009.jpg")
if echo "$RESPONSE" | grep -q "signed"; then
    echo " ✅ Endpoint de firma funcionando"
else
    echo " ❌ Error en endpoint de firma"
    echo "$RESPONSE"
fi

# Test 3: URLs firmadas en /poha/getindex
echo "Test 3: URLs firmadas automáticas en /poha/getindex..."
RESPONSE=$(curl -s "https://back.mindtechpy.net/pohapp/api/pohapp/poha/getindex/0/0/0/0/0?page=0&pageSize=1")
if echo "$RESPONSE" | grep -q "img_signed"; then
    echo " ✅ URLs firmadas automáticamente"
else
    echo " ⚠️  Middleware podría no estar firmando automáticamente"
    echo "Verificar logs del pod"
fi

echo ""
echo "${GREEN}✅ Actualización completada!${NC}"
echo ""
echo "📋 Endpoints disponibles:"
echo "  - GET  /api/pohapp/imagenes/signed?url=<URL>"
echo "  - POST /api/pohapp/imagenes/signed-batch"
echo "  - GET  /api/pohapp/imagenes/proxy/<objectName>"
echo "  - GET  /api/pohapp/imagenes/info?url=<URL>"
echo ""
echo "📚 Ver documentación completa: docs/MINIO_SIGNED_URLS.md"
echo ""
echo "🔍 Ver logs del pod:"
echo "  kubectl logs -n $NAMESPACE $POD_NAME --tail=50 -f"
echo ""
