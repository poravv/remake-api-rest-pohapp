#!/bin/bash

# Script para configurar todos los secrets de GitHub en una sola ejecución
# Uso: ./setup-secrets.sh

set -e

echo "🔐 Configurando secrets de GitHub para Pohapp Backend..."
echo ""

# Verificar que gh esté instalado
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) no está instalado."
    echo "   Instálalo con: brew install gh (macOS) o apt install gh (Linux)"
    exit 1
fi

# Verificar autenticación
if ! gh auth status &> /dev/null; then
    echo "❌ No estás autenticado en GitHub CLI."
    echo "   Ejecuta: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI está instalado y autenticado"
echo ""

# Función para agregar secret
add_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo "➕ Agregando secret: $secret_name ($description)"
    echo "$secret_value" | gh secret set "$secret_name"
}

# GHCR Token
echo "📦 1/15 - GHCR_PAT (GitHub Container Registry Token)"
read -p "   Ingresa tu Personal Access Token de GitHub: " GHCR_PAT
add_secret "GHCR_PAT" "$GHCR_PAT" "GitHub Container Registry Token"

# MySQL Secrets
echo ""
echo "🗄️  2/15 - MYSQL_ROOT_PASSWORD"
read -s -p "   Ingresa la contraseña root de MySQL: " MYSQL_ROOT_PASSWORD
echo ""
add_secret "MYSQL_ROOT_PASSWORD" "$MYSQL_ROOT_PASSWORD" "MySQL Root Password"

echo ""
echo "🗄️  3/15 - MYSQL_USER"
read -p "   Ingresa el usuario de MySQL (default: pohapp_user): " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-pohapp_user}
add_secret "MYSQL_USER" "$MYSQL_USER" "MySQL User"

echo ""
echo "🗄️  4/15 - MYSQL_PASSWORD"
read -s -p "   Ingresa la contraseña del usuario MySQL: " MYSQL_PASSWORD
echo ""
add_secret "MYSQL_PASSWORD" "$MYSQL_PASSWORD" "MySQL Password"

echo ""
echo "🗄️  5/15 - MYSQL_DATABASE"
read -p "   Ingresa el nombre de la base de datos (default: db-pohapp): " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-db-pohapp}
add_secret "MYSQL_DATABASE" "$MYSQL_DATABASE" "MySQL Database"

# Backend App Secrets
echo ""
echo "🔧 6/15 - DB_HOST"
add_secret "DB_HOST" "mysql-service" "Database Host"

echo ""
echo "🔧 7/15 - DB_PORT"
add_secret "DB_PORT" "3306" "Database Port"

echo ""
echo "🔧 8/15 - DB_USER"
add_secret "DB_USER" "$MYSQL_USER" "Database User (same as MYSQL_USER)"

echo ""
echo "🔧 9/15 - DB_PASSWORD"
add_secret "DB_PASSWORD" "$MYSQL_PASSWORD" "Database Password (same as MYSQL_PASSWORD)"

echo ""
echo "🔧 10/15 - DB_DATABASE"
add_secret "DB_DATABASE" "$MYSQL_DATABASE" "Database Name (same as MYSQL_DATABASE)"

echo ""
echo "🔧 11/15 - DB_NAME"
add_secret "DB_NAME" "$MYSQL_DATABASE" "Database Name (same as MYSQL_DATABASE)"

echo ""
echo "🔐 12/15 - POHAPP_API_SECRET"
read -s -p "   Ingresa la clave secreta de la API: " POHAPP_API_SECRET
echo ""
add_secret "POHAPP_API_SECRET" "$POHAPP_API_SECRET" "Pohapp API Secret"

echo ""
echo "🔐 13/15 - POHAPP_ADMIN_KEY"
read -s -p "   Ingresa la clave de administrador: " POHAPP_ADMIN_KEY
echo ""
add_secret "POHAPP_ADMIN_KEY" "$POHAPP_ADMIN_KEY" "Pohapp Admin Key"

echo ""
echo "🤖 14/15 - MODEL_VERSION"
read -p "   Ingresa la versión del modelo (default: v20250504): " MODEL_VERSION
MODEL_VERSION=${MODEL_VERSION:-v20250504}
add_secret "MODEL_VERSION" "$MODEL_VERSION" "Model Version"

echo ""
echo "🤖 15/15 - OPENAI_API_KEY"
read -s -p "   Ingresa tu API Key de OpenAI: " OPENAI_API_KEY
echo ""
add_secret "OPENAI_API_KEY" "$OPENAI_API_KEY" "OpenAI API Key"

echo ""
echo "✅ ¡Todos los secrets han sido configurados exitosamente!"
echo ""
echo "📋 Resumen:"
echo "   - GHCR_PAT: ✓"
echo "   - MySQL Secrets (5): ✓"
echo "   - Backend Secrets (10): ✓"
echo ""
echo "🚀 Ahora puedes hacer push a main para desplegar:"
echo "   git add ."
echo "   git commit -m 'Add Kubernetes deployment'"
echo "   git push origin main"
