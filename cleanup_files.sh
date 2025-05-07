#!/bin/bash

# Script para eliminar archivos no utilizados en el proyecto POHAPP
# Creado: 6 de mayo de 2025

# Colores para la salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

echo -e "${GREEN}=======================================================${NC}"
echo -e "${YELLOW}Eliminación de archivos JavaScript no utilizados en POHAPP${NC}"
echo -e "${GREEN}=======================================================${NC}"
echo ""

# Archivos a eliminar
FILES_TO_REMOVE=(
    "./explore-models.js"
    "./fix-model-dimensions.js"
    "./test-api-ia.js"
    "./examples/client_api_examples.js"
    "./examples/api_test_client.js"
)

echo -e "${YELLOW}Verificando archivos antes de eliminar...${NC}"
echo ""

# Verificar que los archivos existen y están respaldados
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        if [ -f "./archivos_obsoletos/$file" ] || [ -f "./archivos_obsoletos/examples/$filename" ]; then
            echo -e "✅ Archivo ${YELLOW}$file${NC} encontrado y respaldado"
        else
            echo -e "❌ ${RED}ERROR${NC}: Archivo ${YELLOW}$file${NC} no ha sido respaldado correctamente"
            exit 1
        fi
    else
        echo -e "❓ Archivo ${YELLOW}$file${NC} no encontrado, omitiendo..."
    fi
done

echo ""
echo -e "${YELLOW}¿Desea continuar con la eliminación? (s/n)${NC}"
read -r response

if [[ "$response" =~ ^[Ss]$ ]]; then
    echo ""
    echo -e "${YELLOW}Eliminando archivos...${NC}"
    
    # Eliminar archivos
    for file in "${FILES_TO_REMOVE[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo -e "🗑️ Archivo ${YELLOW}$file${NC} eliminado"
        fi
    done
    
    echo ""
    echo -e "${GREEN}Eliminación completada con éxito.${NC}"
    echo -e "${YELLOW}Los archivos originales están respaldados en la carpeta 'archivos_obsoletos'.${NC}"
    echo -e "${GREEN}=======================================================${NC}"
else
    echo ""
    echo -e "${YELLOW}Operación cancelada. Los archivos no han sido eliminados.${NC}"
fi
