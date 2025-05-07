#!/bin/bash

# Script para diagnosticar problemas con hinchazón abdominal
# Este script realiza pruebas específicas para entender por qué
# no se encuentra "hinchazón abdominal" en la base de datos

# Colores para la salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

# URL base de la API
API_URL="http://localhost:3000/api/pohapp/ia"

# Consulta directa para probar
echo -e "${YELLOW}=== Diagnóstico de búsqueda: Hinchazón abdominal ===${NC}"

# Verificar que el servidor está corriendo
echo -e "${BLUE}Verificando que el servidor está activo...${NC}"
if ! curl -s "$API_URL/estado" > /dev/null; then
    echo -e "${RED}❌ El servidor no está respondiendo. Inicie el servidor antes de ejecutar este script.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Servidor respondiendo${NC}"

# Consulta explícita
echo -e "\n${BLUE}Probando consulta directa: 'hinchazón abdominal'${NC}"
RESULT=$(curl -s "$API_URL/buscar?consulta=hinchaz%C3%B3n%20abdominal")

# Extraer información
CATEGORY=$(echo "$RESULT" | grep -o '"interpretedCategory":"[^"]*"' | cut -d'"' -f4)
METADATA=$(echo "$RESULT" | grep -o '"metadata":{[^}]*}' | tr -d '{}"' | tr ',' '\n')
RESULTS_COUNT=$(echo "$RESULT" | grep -o '"totalResults":[0-9]*' | cut -d':' -f2)

echo -e "${YELLOW}Análisis de la respuesta:${NC}"
echo -e "${GREEN}Categoría interpretada:${NC} $CATEGORY"
echo -e "${GREEN}Metadatos:${NC}\n$METADATA"
echo -e "${GREEN}Total de resultados:${NC} $RESULTS_COUNT"

# Ver estructura de la respuesta
echo -e "\n${BLUE}Analizando resultados...${NC}"
if [ "$RESULTS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Se encontraron resultados${NC}"
    
    # Extraer los 2 primeros resultados
    RESULT_DETAILS=$(echo "$RESULT" | grep -o '"results":\[.*\]' | sed 's/"results":\[//;s/\]$//' | tr '{' '\n' | head -3)
    echo -e "${YELLOW}Detalles de los resultados:${NC}"
    echo "$RESULT_DETAILS" | while read -r line; do
        if [ -n "$line" ]; then
            ID=$(echo "$line" | grep -o '"idpoha":[0-9]*' | cut -d':' -f2)
            PREP=$(echo "$line" | grep -o '"preparado":"[^"]*"' | cut -d'"' -f4)
            DOL=$(echo "$line" | grep -o '"dolencias":"[^"]*"' | cut -d'"' -f4)
            
            echo -e "  ${GREEN}ID:${NC} $ID"
            echo -e "  ${GREEN}Preparado:${NC} $PREP"
            echo -e "  ${GREEN}Dolencias:${NC} $DOL"
            echo ""
        fi
    done
else
    echo -e "${RED}❌ No se encontraron resultados${NC}"
    
    # Realizar consulta directa a la base de datos (si tiene permisos)
    echo -e "\n${BLUE}Buscando 'hinchazón abdominal' directamente en la tabla dolencias...${NC}"
    echo "Esta acción requiere que tengas configurado el acceso a la base de datos"
    echo "Ejecuta manualmente en tu gestor de base de datos:"
    echo -e "${YELLOW}  SELECT * FROM dolencias WHERE descripcion LIKE '%hinchaz%' OR descripcion LIKE '%abdominal%';${NC}"
    echo ""
    echo -e "${BLUE}También puedes probar estas consultas alternativas:${NC}"
    echo -e "${YELLOW}1. Inflamación abdominal${NC}"
    echo -e "${YELLOW}2. Problemas digestivos${NC}"
    echo -e "${YELLOW}3. Desinflamante para el vientre${NC}"
fi

echo -e "\n${YELLOW}=== Fin del diagnóstico ===${NC}"
