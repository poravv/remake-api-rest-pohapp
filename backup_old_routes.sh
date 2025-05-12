#!/bin/bash

# Script para respaldar y eliminar archivos obsoletos después de la reorganización

# Colores para mensajes en terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorio base del proyecto
BASE_DIR="$(pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${BASE_DIR}/archivos_obsoletos/rutas_${TIMESTAMP}"

echo -e "${YELLOW}Iniciando respaldo y limpieza de archivos obsoletos...${NC}"

# Crear directorio de backup con timestamp
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}Directorio de respaldo creado: ${BACKUP_DIR}${NC}"

# Lista de archivos de rutas antiguas a respaldar
FILES_TO_BACKUP=(
  "src/routes/ruta_autor.js"
  "src/routes/ruta_dolencias.js"
  "src/routes/ruta_dolencias_poha.js"
  "src/routes/ruta_ia.js"
  "src/routes/ruta_medicinales.js"
  "src/routes/ruta_planta.js"
  "src/routes/ruta_poha.js"
  "src/routes/ruta_poha_planta.js"
  "src/routes/ruta_puntos.js"
  "src/routes/ruta_usuario.js"
)

# Respaldar y eliminar archivos
for file in "${FILES_TO_BACKUP[@]}"; do
  if [ -f "$file" ]; then
    # Crear estructura de directorios en el backup
    dir_name=$(dirname "$file")
    mkdir -p "${BACKUP_DIR}/${dir_name}"
    
    # Copiar el archivo
    cp "$file" "${BACKUP_DIR}/${file}"
    echo -e "${GREEN}Respaldado: ${file}${NC}"
    
    # Eliminar el archivo original
    rm "$file"
    echo -e "${YELLOW}Eliminado: ${file}${NC}"
  else
    echo -e "${RED}Archivo no encontrado: ${file}${NC}"
  fi
done

echo -e "${GREEN}Reorganización completada. Los archivos antiguos han sido respaldados en: ${BACKUP_DIR}${NC}"

# Crear un archivo README en el directorio de respaldo
cat > "${BACKUP_DIR}/README.md" << EOL
# Archivos de Rutas Obsoletos

Este directorio contiene archivos de rutas obsoletos que fueron reemplazados durante la reorganización del proyecto.
Fecha de la migración: $(date)

Estos archivos se conservan solo como referencia histórica y ya no son utilizados por la aplicación.
EOL

echo -e "${GREEN}Documentación de respaldo creada${NC}"
