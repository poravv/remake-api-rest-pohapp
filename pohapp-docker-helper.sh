#!/bin/bash

# Script para ayudar con el despliegue y prueba de la aplicación POHAPP con Docker
# Uso: ./pohapp-docker-helper.sh [comando]

# Colores para la salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}=========================================================${NC}"
    echo -e "${GREEN}POHAPP Docker Helper${NC}"
    echo -e "${BLUE}=========================================================${NC}"
    echo ""
    echo -e "${YELLOW}Uso:${NC}"
    echo "  ./pohapp-docker-helper.sh [comando]"
    echo ""
    echo -e "${YELLOW}Comandos disponibles:${NC}"
    echo "  start         - Iniciar los contenedores"
    echo "  stop          - Detener los contenedores"
    echo "  restart       - Reiniciar los contenedores"
    echo "  logs          - Ver logs del API"
    echo "  status        - Verificar el estado de los contenedores"
    echo "  test-api      - Probar que la API esté funcionando"
    echo "  test-ia       - Probar los endpoints de IA específicamente"
    echo "  rebuild       - Reconstruir la imagen de la API"
    echo "  clean         - Limpiar recursos (contenedores, imágenes, volúmenes)"
    echo ""
}

# Función para iniciar los contenedores
start_containers() {
    echo -e "${BLUE}Iniciando los contenedores de POHAPP...${NC}"
    docker compose up -d
    sleep 2
    docker compose ps
}

# Función para detener los contenedores
stop_containers() {
    echo -e "${BLUE}Deteniendo los contenedores de POHAPP...${NC}"
    docker compose down
}

# Función para ver los logs
view_logs() {
    echo -e "${BLUE}Mostrando logs del API...${NC}"
    docker compose logs -f api
}

# Función para verificar el estado
check_status() {
    echo -e "${BLUE}Estado de los contenedores:${NC}"
    docker compose ps
    echo ""
    
    echo -e "${BLUE}Verificando API:${NC}"
    API_UP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/pohapp/ia/estado || echo "error")
    
    if [ "$API_UP" == "200" ]; then
        echo -e "${GREEN}✅ API accesible${NC}"
    else
        echo -e "${RED}❌ API no accesible - código: $API_UP${NC}"
    fi
    
    echo -e "${BLUE}Verificando MySQL:${NC}"
    DB_UP=$(docker exec pohapp-mysql mysqladmin ping -h localhost --silent || echo "error")
    
    if [[ $DB_UP == *"alive"* ]]; then
        echo -e "${GREEN}✅ MySQL funcionando${NC}"
    else
        echo -e "${RED}❌ MySQL no está disponible${NC}"
    fi
}

# Función para probar la API
test_api() {
    echo -e "${BLUE}Probando API de POHAPP...${NC}"
    echo -e "${YELLOW}Endpoint de estado:${NC}"
    curl -s http://localhost:3000/api/pohapp/ia/estado | jq . || echo "Error. No se puede conectar al API o falta jq"
    
    echo -e "\n${YELLOW}Listado de plantas (prueba básica):${NC}"
    curl -s http://localhost:3000/api/planta | head -n 30
}

# Función para probar los endpoints de IA
test_ia() {
    echo -e "${BLUE}Probando endpoints de IA...${NC}"
    
    echo -e "\n${YELLOW}1. Prueba de validación de texto:${NC}"
    curl -s -X POST http://localhost:3000/api/pohapp/ia/validar \
      -H "Content-Type: application/json" \
      -d '{"texto": "El cedrón es una planta medicinal utilizada para problemas digestivos"}' | jq . || echo "Error al validar texto"
    
    echo -e "\n${YELLOW}2. Prueba de interpretación de consulta:${NC}"
    curl -s "http://localhost:3000/api/pohapp/ia/interpretar?consulta=tengo%20dolor%20de%20cabeza" | jq . || echo "Error al interpretar consulta"
    
    echo -e "\n${YELLOW}3. Prueba de búsqueda:${NC}"
    curl -s "http://localhost:3000/api/pohapp/ia/buscar?consulta=necesito%20algo%20para%20la%20fiebre" | jq . || echo "Error al realizar búsqueda"
}

# Función para reconstruir la imagen
rebuild() {
    echo -e "${BLUE}Reconstruyendo imagen del API...${NC}"
    docker compose down
    docker compose build --no-cache api
    docker compose up -d
    echo -e "${GREEN}Imagen reconstruida y contenedores iniciados${NC}"
}

# Función para limpiar recursos
clean() {
    echo -e "${RED}¡ADVERTENCIA! Esta acción eliminará todos los contenedores, imágenes y volúmenes de POHAPP${NC}"
    read -p "¿Está seguro que desea continuar? (s/n): " confirm
    if [[ $confirm == [sS] ]]; then
        echo -e "${BLUE}Deteniendo y eliminando contenedores...${NC}"
        docker compose down
        
        echo -e "${BLUE}Eliminando imágenes de POHAPP...${NC}"
        docker images | grep pohapp | awk '{print $3}' | xargs -r docker rmi -f
        
        echo -e "${BLUE}Eliminando volúmenes de POHAPP...${NC}"
        docker volume ls | grep pohapp | awk '{print $2}' | xargs -r docker volume rm
        
        echo -e "${GREEN}Recursos de POHAPP eliminados${NC}"
    else
        echo -e "${YELLOW}Operación cancelada${NC}"
    fi
}

# Verificar argumentos
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Ejecutar el comando correspondiente
case $1 in
    start)
        start_containers
        ;;
    stop)
        stop_containers
        ;;
    restart)
        stop_containers
        start_containers
        ;;
    logs)
        view_logs
        ;;
    status)
        check_status
        ;;
    test-api)
        test_api
        ;;
    test-ia)
        test_ia
        ;;
    rebuild)
        rebuild
        ;;
    clean)
        clean
        ;;
    *)
        echo -e "${RED}Comando no reconocido: $1${NC}"
        show_help
        exit 1
        ;;
esac
