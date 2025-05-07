#!/bin/bash

# Script para probar específicamente la búsqueda de "Hinchazón abdominal"
# Hace una consulta directa a la API con el término exacto

# Colores para la salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

# URL de la API y consulta
API_URL="http://localhost:3000/api/pohapp/ia/buscar"
CONSULTA="hinchazón abdominal"
ENCODED_CONSULTA=$(echo "$CONSULTA" | sed 's/ /%20/g' | sed 's/ó/%C3%B3/g')

echo -e "${YELLOW}=== Prueba forzada de búsqueda: $CONSULTA ===${NC}"
echo -e "${BLUE}Realizando consulta a: $API_URL?consulta=$ENCODED_CONSULTA${NC}\n"

# Hacer la solicitud y guardar la respuesta
RESPONSE=$(curl -s "$API_URL?consulta=$ENCODED_CONSULTA")

# Imprimir respuesta completa para análisis
echo "$RESPONSE" > /tmp/response.json
echo -e "${YELLOW}Respuesta completa guardada en /tmp/response.json${NC}\n"

# Extraer información relevante
RESULTS_COUNT=$(echo "$RESPONSE" | grep -o '"totalResults":[0-9]*' | cut -d':' -f2)

if [ -z "$RESULTS_COUNT" ]; then
    echo -e "${RED}Error en la respuesta de la API${NC}"
    echo -e "Respuesta recibida:\n$RESPONSE"
    exit 1
fi

echo -e "${GREEN}Total de resultados encontrados: $RESULTS_COUNT${NC}"

if [ "$RESULTS_COUNT" -gt 0 ]; then
    echo -e "\n${GREEN}Remedios encontrados:${NC}"
    
    # Extraer preparados de los resultados
    echo "$RESPONSE" | grep -o '"preparado":"[^"]*"' | cut -d'"' -f4 | while read -r preparado; do
        echo -e "  - $preparado"
    done
    
    # Extraer dolencias de los resultados
    echo -e "\n${GREEN}Dolencias relacionadas:${NC}"
    echo "$RESPONSE" | grep -o '"dolencias":"[^"]*"' | cut -d'"' -f4 | while read -r dolencias; do
        echo -e "  - $dolencias"
    done
    
    # Extraer plantas de los resultados
    echo -e "\n${GREEN}Plantas utilizadas:${NC}"
    echo "$RESPONSE" | grep -o '"plantas_nombres":"[^"]*"' | cut -d'"' -f4 | while read -r plantas; do
        echo -e "  - $plantas"
    done
else
    echo -e "${RED}No se encontraron resultados para la consulta.${NC}"
fi

echo -e "\n${YELLOW}=== Fin de la prueba ===${NC}"
