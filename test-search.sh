#!/bin/bash

# Script para probar la funcionalidad de búsqueda POHAPP con IA
# Este script envía consultas de prueba a la API para verificar la correcta identificación de remedios.

# Colores para la salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

# URL base de la API
API_URL="http://localhost:3000/api/pohapp/ia"

# Función para realizar una consulta
function test_query() {
    local query="$1"
    local description="$2"
    
    echo -e "\n${YELLOW}=== Probando: ${description} ===${NC}"
    echo -e "${BLUE}Consulta: \"$query\"${NC}"
    
    # Escapar la consulta para URL
    local encoded_query=$(python -c "import urllib.parse; print(urllib.parse.quote('''$query'''))")
    
    # Realizar la petición
    local response=$(curl -s "${API_URL}/buscar?consulta=${encoded_query}")
    
    # Extraer información relevante de la respuesta JSON
    local category=$(echo "$response" | grep -o '"interpretedCategory":"[^"]*"' | cut -d'"' -f4)
    local confidence=$(echo "$response" | grep -o '"confidence":[0-9.]*' | cut -d':' -f2)
    local total=$(echo "$response" | grep -o '"totalResults":[0-9]*' | cut -d':' -f2)
    local search_type=$(echo "$response" | grep -o '"searchType":"[^"]*"' | cut -d'"' -f4)
    
    echo -e "${GREEN}Categoría: $category ${NC}"
    echo -e "${GREEN}Confianza: $confidence ${NC}"
    echo -e "${GREEN}Resultados: $total ${NC}"
    echo -e "${GREEN}Tipo búsqueda: $search_type ${NC}"
    
    # Mostrar hasta 3 remedios encontrados
    local remedios=$(echo "$response" | grep -o '"preparado":"[^"]*"' | cut -d'"' -f4 | head -3)
    
    if [[ -n "$remedios" ]]; then
        echo -e "${GREEN}Algunos remedios encontrados:${NC}"
        echo "$remedios" | while read remedio; do
            echo -e " - $remedio"
        done
    else
        echo -e "${RED}No se encontraron remedios${NC}"
    fi
}

# Imprimir cabecera
echo -e "${GREEN}=================================================================${NC}"
echo -e "${YELLOW}       PRUEBA DE BÚSQUEDA POHAPP CON INTELIGENCIA ARTIFICIAL${NC}"
echo -e "${GREEN}=================================================================${NC}"

# Ejecutar pruebas
test_query "Me duele mucho la cabeza" "Dolor de cabeza"
test_query "Tengo fiebre alta desde ayer" "Fiebre"
test_query "No puedo dormir bien" "Insomnio"
test_query "Estoy con mucha tos" "Tos"
test_query "Me duele el estómago y tengo náuseas" "Problemas digestivos"
test_query "Tengo un catarro muy fuerte" "Catarro"
test_query "Estoy con dolor de garganta" "Dolor de garganta"
test_query "Hinchazón abdominal" "Hinchazón abdominal"
test_query "Tengo ansiedad y no puedo relajarme" "Ansiedad"

echo -e "\n${GREEN}=================================================================${NC}"
echo -e "${YELLOW}                         FIN DE LAS PRUEBAS${NC}"
echo -e "${GREEN}=================================================================${NC}"
