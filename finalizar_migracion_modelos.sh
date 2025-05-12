#!/bin/bash

# Script para finalizar la migración de modelos y eliminar los antiguos
# Autor: Andres Vera
# Fecha: 12/05/2025

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Directorio de trabajo
WORKSPACE="/Users/andresvera/Desktop/Proyectos/pohapp/actual/api-rest-pohapp-main"
cd "$WORKSPACE" || { echo "Error: No se pudo acceder al directorio del proyecto"; exit 1; }

echo -e "${BLUE}${BOLD}==================================================${NC}"
echo -e "${BLUE}${BOLD}  Finalización de migración de modelos  ${NC}"
echo -e "${BLUE}${BOLD}==================================================${NC}"
echo

# Probar los modelos migrados
echo -e "${YELLOW}1. Ejecutando pruebas de los modelos migrados...${NC}"
node tests/test_models_migrados.js

if [ $? -ne 0 ]; then
    echo -e "${RED}${BOLD}Error: Las pruebas de los modelos migrados han fallado${NC}"
    echo -e "${RED}Revisa los errores y corrige los modelos antes de continuar${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pruebas completadas exitosamente${NC}"
echo

# Crear directorio de backup final
BACKUP_DIR="$WORKSPACE/archivos_obsoletos/modelos_old_$(date "+%Y%m%d-%H%M%S")"
mkdir -p "$BACKUP_DIR"

# Mover los modelos antiguos al backup
echo -e "${YELLOW}2. Haciendo backup y eliminando los modelos antiguos...${NC}"
cp -r "$WORKSPACE/src/model/" "$BACKUP_DIR/"

if [ $? -eq 0 ]; then
    # Eliminar la carpeta model antigua
    rm -rf "$WORKSPACE/src/model/"
    echo -e "${GREEN}✓ Modelos antiguos respaldados y eliminados correctamente${NC}"
else
    echo -e "${RED}Error al hacer backup de los modelos antiguos${NC}"
    exit 1
fi

echo
echo -e "${GREEN}${BOLD}==================================================${NC}"
echo -e "${GREEN}${BOLD}  ¡Migración finalizada con éxito!  ${NC}"
echo -e "${GREEN}${BOLD}==================================================${NC}"
echo
echo -e "${YELLOW}Resumen:${NC}"
echo -e "  • Los modelos han sido migrados y probados correctamente"
echo -e "  • Los modelos antiguos han sido respaldados en: ${BACKUP_DIR}"
echo -e "  • La carpeta src/model/ ha sido eliminada"
echo
echo -e "${BLUE}Próximos pasos:${NC}"
echo -e "  1. Actualizar las referencias a modelos en los controladores si es necesario"
echo -e "  2. Actualizar las referencias en las rutas y servicios"
echo
echo -e "${GREEN}Para ejecutar la aplicación:${NC}"
echo -e "  npm start"
echo
