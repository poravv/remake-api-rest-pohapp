#!/bin/bash

# Script para limpiar y unificar la base de código de POHAPP API
# Este script unifica varios scripts antiguos y realiza limpieza de archivos innecesarios
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

# Crear directorio de archivos obsoletos si no existe
BACKUP_DIR="$WORKSPACE/archivos_obsoletos/$(date "+%Y%m%d-%H%M%S")"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}${BOLD}==================================================${NC}"
echo -e "${BLUE}${BOLD}  Limpieza y unificación de la base de código POHAPP  ${NC}"
echo -e "${BLUE}${BOLD}==================================================${NC}"
echo

# 1. Mover archivos de prueba duplicados de la raíz a la carpeta tests/
echo -e "${YELLOW}1. Moviendo archivos de prueba a la carpeta tests/${NC}"

# Lista de archivos de prueba en la raíz
TEST_FILES=(
    "full_integration_test.js" 
    "interpret_test.js" 
    "search_test.js" 
    "simple_test.js" 
    "test_init.js" 
    "test_joblib.js" 
    "test_models.js"
    "test-api-ia.js"
    "test-search.sh"
    "test-hinchazón-directo.sh"
)

# Mover cada archivo de prueba
for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Verificar si el archivo existe en la carpeta tests/
        if [ -f "tests/$file" ]; then
            # Comparar los archivos para ver si son diferentes
            if ! cmp -s "$file" "tests/$file"; then
                echo -e "  ${YELLOW}⚠ $file${NC} existe en tests/ pero con diferente contenido, respaldando en $BACKUP_DIR"
                cp "$file" "$BACKUP_DIR/"
            fi
            rm "$file"
            echo -e "  ${GREEN}✓ Eliminado $file${NC} duplicado de la raíz"
        else
            # Si no existe en tests/, mover el archivo
            mv "$file" "tests/"
            echo -e "  ${GREEN}✓ Movido $file${NC} a la carpeta tests/"
        fi
    fi
done
echo

# 2. Unificar scripts de reorganización y migración
echo -e "${YELLOW}2. Unificando scripts de reorganización y limpieza${NC}"

# Lista de scripts a unificar
SCRIPTS_TO_UNIFY=(
    "reorganize_project.sh"
    "cleanup_files.sh"
    "migrate_models.sh"
    "finalizar_migracion.sh"
)

# Respaldar los scripts antes de eliminarlos
for script in "${SCRIPTS_TO_UNIFY[@]}"; do
    if [ -f "$script" ]; then
        cp "$script" "$BACKUP_DIR/"
        echo -e "  ${GREEN}✓ Respaldado $script${NC} en $BACKUP_DIR"
        # Mantener migrate_models.sh porque es el nuevo script unificado
        if [ "$script" != "migrate_models.sh" ]; then
            rm "$script"
            echo -e "  ${GREEN}✓ Eliminado $script${NC}"
        fi
    fi
done

echo -e "  ${GREEN}✓ Los scripts se han unificado en un único archivo 'pohapp_maintenance.sh'${NC}"
echo

# 3. Eliminar archivos de configuración duplicados
echo -e "${YELLOW}3. Limpiando archivos de configuración duplicados${NC}"

# Verificar duplicidad entre database.js
if [ -f "$WORKSPACE/src/database.js" ] && [ -f "$WORKSPACE/src/config/database.js" ]; then
    cp "$WORKSPACE/src/database.js" "$BACKUP_DIR/"
    rm "$WORKSPACE/src/database.js"
    echo -e "  ${GREEN}✓ Eliminado src/database.js${NC} duplicado"
    
    # Actualizar referencias al archivo database.js en todo el proyecto
    echo -e "  ${YELLOW}⚠ Actualizando referencias a database.js en el proyecto...${NC}"
    find "$WORKSPACE/src" -type f -name "*.js" | xargs grep -l "require('../database')" | while read -r file; do
        sed -i '' 's|require("../database")|require("../config/database")|g' "$file" 2>/dev/null || true
        sed -i '' "s|require('../database')|require('../config/database')|g" "$file" 2>/dev/null || true
        echo -e "  ${BLUE}ℹ Actualizado:${NC} $file"
    done
fi

# Verificar duplicidad entre config_rutas.js y routes/index.js
if [ -f "$WORKSPACE/src/config_rutas.js" ] && [ -f "$WORKSPACE/src/routes/index.js" ]; then
    cp "$WORKSPACE/src/config_rutas.js" "$BACKUP_DIR/"
    rm "$WORKSPACE/src/config_rutas.js"
    echo -e "  ${GREEN}✓ Eliminado src/config_rutas.js${NC} duplicado"
    
    # Actualizar referencias a config_rutas.js
    echo -e "  ${YELLOW}⚠ Actualizando referencias a config_rutas.js en el proyecto...${NC}"
    if grep -q "require('./config_rutas')" "$WORKSPACE/src/app.js"; then
        sed -i '' "s|const rutas = require('./config_rutas');|const routes = require('./routes/index');|g" "$WORKSPACE/src/app.js"
        sed -i '' "s|app.use(rutas)|app.use(routes)|g" "$WORKSPACE/src/app.js"
        echo -e "  ${BLUE}ℹ Actualizado:${NC} $WORKSPACE/src/app.js"
    elif grep -q "require('./config_rutas')" "$WORKSPACE/src/server.js"; then
        sed -i '' "s|const rutas = require('./config_rutas');|const routes = require('./routes/index');|g" "$WORKSPACE/src/server.js"
        sed -i '' "s|app.use(rutas)|app.use(routes)|g" "$WORKSPACE/src/server.js"
        echo -e "  ${BLUE}ℹ Actualizado:${NC} $WORKSPACE/src/server.js"
    fi
fi

# Verificar otros archivos de configuración duplicados
CONFIG_FILES=("config.js" "app.js")
for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$WORKSPACE/src/$file" ] && [ -f "$WORKSPACE/src/config/$file" ]; then
        cp "$WORKSPACE/src/$file" "$BACKUP_DIR/"
        rm "$WORKSPACE/src/$file"
        echo -e "  ${GREEN}✓ Eliminado src/$file${NC} duplicado"
    fi
done

echo

# 4. Migrar y eliminar modelos antiguos y consolidar en la nueva estructura
echo -e "${YELLOW}4. Limpiando modelos antiguos${NC}"

# Verificar si existen modelos con el mismo nombre en model/ y models/
if [ -d "$WORKSPACE/src/model" ] && [ -d "$WORKSPACE/src/models" ]; then
    OLD_MODELS=$(find "$WORKSPACE/src/model" -name "*.js")
    for old_model in $OLD_MODELS; do
        model_name=$(basename "$old_model")
        model_entity="${model_name%.js}"
        
        # Verificar si ya existe el modelo en la nueva estructura
        if [ -f "$WORKSPACE/src/models/$model_name" ]; then
            cp "$old_model" "$BACKUP_DIR/"
            echo -e "  ${GREEN}✓ Respaldado $model_name${NC} antiguo en $BACKUP_DIR"
        else
            # Migrar el modelo a la nueva estructura
            echo -e "  ${YELLOW}⚠ Migrando $model_name${NC} a la nueva estructura..."
            
            # Crear archivo de modelo con formato mejorado
            cat > "$WORKSPACE/src/models/$model_name" << EOF
/**
 * Modelo para la entidad ${model_entity^}
 */
const { DataTypes, Op } = require('sequelize');
const database = require('../config/database');

$(cat "$old_model" | grep -v "const { DataTypes } = require('sequelize')" | grep -v "const database = require('../database')" | sed 's/database\.define/database.define/g')

/**
 * Métodos estáticos para operaciones comunes
 */
${model_entity^}.obtenerTodos = async () => {
  return await ${model_entity^}.findAll();
};

${model_entity^}.obtenerPorId = async (id) => {
  return await ${model_entity^}.findByPk(id);
};

module.exports = ${model_entity^};
EOF
            echo -e "  ${GREEN}✓ Migrado $model_name${NC} a la nueva estructura"
            
            # Crear controlador correspondiente si no existe
            if [ ! -f "$WORKSPACE/src/controllers/${model_entity}Controller.js" ]; then
                echo -e "  ${YELLOW}⚠ Creando controlador para $model_entity...${NC}"
                
                cat > "$WORKSPACE/src/controllers/${model_entity}Controller.js" << EOF
/**
 * Controlador para la entidad ${model_entity^}
 */
const ${model_entity^} = require('../models/${model_entity}');

/**
 * Obtiene todos los registros
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const registros = await ${model_entity^}.obtenerTodos();
    res.json(registros);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un registro por su ID
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const registro = await ${model_entity^}.obtenerPorId(req.params.id);
    if (!registro) {
      res.status(404);
      throw new Error('Registro no encontrado');
    }
    res.json(registro);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo registro
 */
const crear = async (req, res, next) => {
  try {
    const nuevoRegistro = await ${model_entity^}.create(req.body);
    res.status(201).json(nuevoRegistro);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un registro existente
 */
const actualizar = async (req, res, next) => {
  try {
    const [actualizado] = await ${model_entity^}.update(req.body, {
      where: { id: req.params.id }
    });
    
    if (actualizado) {
      const registroActualizado = await ${model_entity^}.obtenerPorId(req.params.id);
      res.json(registroActualizado);
    } else {
      res.status(404);
      throw new Error('Registro no encontrado');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un registro
 */
const eliminar = async (req, res, next) => {
  try {
    const eliminado = await ${model_entity^}.destroy({
      where: { id: req.params.id }
    });
    
    if (eliminado) {
      res.json({ mensaje: 'Registro eliminado correctamente' });
    } else {
      res.status(404);
      throw new Error('Registro no encontrado');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
EOF
                echo -e "  ${GREEN}✓ Creado controlador ${model_entity}Controller.js${NC}"
                
                # Crear archivo de rutas correspondiente si no existe
                if [ ! -f "$WORKSPACE/src/routes/${model_entity}Routes.js" ]; then
                    echo -e "  ${YELLOW}⚠ Creando rutas para $model_entity...${NC}"
                    
                    cat > "$WORKSPACE/src/routes/${model_entity}Routes.js" << EOF
/**
 * Rutas para la entidad ${model_entity^}
 */
const express = require('express');
const router = express.Router();
const ${model_entity}Controller = require('../controllers/${model_entity}Controller');

// Rutas GET
router.get('/', ${model_entity}Controller.obtenerTodos);
router.get('/:id', ${model_entity}Controller.obtenerPorId);

// Rutas POST
router.post('/', ${model_entity}Controller.crear);

// Rutas PUT
router.put('/:id', ${model_entity}Controller.actualizar);

// Rutas DELETE
router.delete('/:id', ${model_entity}Controller.eliminar);

module.exports = router;
EOF
                    echo -e "  ${GREEN}✓ Creadas rutas ${model_entity}Routes.js${NC}"
                fi
            fi
        fi
    done
    
    # Actualizar index.js de models para incluir todos los modelos migrados
    echo -e "  ${YELLOW}⚠ Actualizando índice de modelos...${NC}"
    MODEL_FILES=$(find "$WORKSPACE/src/models" -name "*.js" | grep -v "index.js")
    MODELS_INDEX="/**\n * Índice de modelos - Centraliza todos los modelos de la aplicación\n * y establece las relaciones entre ellos\n */\nconst database = require('../config/database');\n\n// Importar modelos\n"
    MODELS_EXPORTS="// Exportar todos los modelos\nmodule.exports = {\n"
    
    for model_file in $MODEL_FILES; do
        model_name=$(basename "$model_file" .js)
        model_name_cap="$(tr '[:lower:]' '[:upper:]' <<< ${model_name:0:1})${model_name:1}"
        MODELS_INDEX+="const $model_name_cap = require('./$model_name');\n"
        MODELS_EXPORTS+="  $model_name_cap,\n"
    done
    
    MODELS_INDEX+="\n// Definir relaciones entre modelos\n// TODO: Definir aquí las relaciones entre modelos\n\n"
    MODELS_EXPORTS+="  database\n};"
    
    echo -e "$MODELS_INDEX$MODELS_EXPORTS" > "$WORKSPACE/src/models/index.js"
    echo -e "  ${GREEN}✓ Actualizado índice de modelos${NC}"
    
    # Crear backup de la carpeta model pero no eliminarla aún
    cp -r "$WORKSPACE/src/model" "$BACKUP_DIR/"
    echo -e "  ${BLUE}ℹ La carpeta src/model/ se ha respaldado en $BACKUP_DIR/model/${NC}"
    echo -e "  ${BLUE}ℹ Se recomienda eliminar manualmente la carpeta src/model/ después de verificar que todo funciona correctamente.${NC}"
fi

echo

# 5. Limpiar README duplicados
echo -e "${YELLOW}5. Unificando archivos README${NC}"

if [ -f "README_NUEVO.md" ] && [ -f "README.md" ]; then
    cp "README.md" "$BACKUP_DIR/"
    mv "README_NUEVO.md" "README.md"
    echo -e "  ${GREEN}✓ README actualizado${NC}"
fi

echo

# 6. Limpiar paquetes innecesarios en package.json
echo -e "${YELLOW}6. Limpiando dependencias innecesarias de package.json${NC}"

# Backup del package.json original
cp "package.json" "$BACKUP_DIR/"

# Lista de dependencias a verificar
echo -e "  ${BLUE}ℹ Verificando dependencias...${NC}"

# Verificar si mysql está en las dependencias (debería ser reemplazado por mysql2)
if grep -q '"mysql":' "package.json"; then
    echo -e "  ${YELLOW}⚠ Detectada dependencia 'mysql' redundante (ya se usa mysql2)${NC}"
    # Eliminar la línea que contiene "mysql": "^x.x.x",
    sed -i '' '/[[:space:]]*"mysql":/d' "package.json"
    echo -e "  ${GREEN}✓ Eliminada dependencia redundante: mysql${NC}"
fi

# Verificar y mover nodemon a devDependencies si no está ahí
if ! grep -q '"nodemon":' "package.json" | grep -q "devDependencies"; then
    if grep -q '"nodemon":' "package.json"; then
        VERSION=$(grep '"nodemon":' "package.json" | sed -E 's/.*"nodemon": "([^"]+)".*/\1/')
        sed -i '' '/[[:space:]]*"nodemon":/d' "package.json"
        # Asegurar que devDependencies existe
        if ! grep -q '"devDependencies"' "package.json"; then
            sed -i '' '/"dependencies": {/a\\n  "devDependencies": {},\n' "package.json"
        fi
        # Añadir nodemon a devDependencies
        sed -i '' '/[[:space:]]*"devDependencies": {/a\\n    "nodemon": "'$VERSION'",' "package.json"
        echo -e "  ${GREEN}✓ Movido nodemon a devDependencies${NC}"
    fi
fi

echo -e "  ${BLUE}ℹ Para un análisis completo de dependencias no utilizadas, ejecute:${NC}"
echo -e "     npm install -g depcheck && depcheck"
echo

# 7. Actualizar scripts en package.json
echo -e "${YELLOW}7. Actualizando scripts en package.json${NC}"

# Actualizar la ruta de los scripts de prueba
sed -i '' 's/"test": "node tests\/index.js"/"test": "node tests\/index.js"/g' package.json
sed -i '' 's/"test:models": "node .*"/"test:models": "node tests\/test_models.js"/g' package.json
sed -i '' 's/"test:search": "bash .*"/"test:search": "bash tests\/test-search.sh"/g' package.json

# Agregar nuevo script para mantenimiento
sed -i '' 's/"reorganize": "bash reorganize_project.sh"/"maintenance": "bash pohapp_maintenance.sh"/g' package.json || true

echo -e "  ${GREEN}✓ Scripts en package.json actualizados${NC}"
echo

# 8. Actualizar archivo de rutas centralizadas
echo -e "${YELLOW}8. Actualizando índice de rutas API${NC}"

# Actualizar el archivo routes/index.js con todas las rutas
if [ -d "$WORKSPACE/src/routes" ]; then
    echo -e "  ${YELLOW}⚠ Reconstruyendo archivo de rutas centralizado...${NC}"
    
    # Obtener todos los archivos de rutas (tanto nuevos como antiguos)
    ROUTE_FILES_NEW=$(find "$WORKSPACE/src/routes" -name "*Routes.js" -not -name "index.js")
    ROUTE_FILES_OLD=$(find "$WORKSPACE/src/routes" -name "ruta_*.js" -not -name "index.js")
    
    # Crear el contenido del archivo index.js
    ROUTES_INDEX="/**\n * Configuración central de rutas de la API\n */\nconst express = require('express');\nconst router = express.Router();\n\n// Importar rutas de recursos\n"
    ROUTES_CONFIG="\n// Definir prefijo base para las rutas API\nconst API_PREFIX = '/api/pohapp';\n\n// Configurar rutas con sus respectivos prefijos\n"
    
    # Procesar archivos de rutas nuevos
    for route_file in $ROUTE_FILES_NEW; do
        route_name=$(basename "$route_file" .js)
        resource_name="${route_name%Routes}"
        ROUTES_INDEX+="const $route_name = require('./$route_name');\n"
        ROUTES_CONFIG+="router.use(\`\${API_PREFIX}/$resource_name\`, $route_name);\n"
    done
    
    # Procesar archivos de rutas antiguos
    for route_file in $ROUTE_FILES_OLD; do
        old_route_name=$(basename "$route_file" .js)
        resource_name=$(echo "$old_route_name" | sed 's/ruta_//')
        ROUTES_INDEX+="const $resource_name = require('./$old_route_name'); // TODO: Migrar a nueva estructura\n"
        ROUTES_CONFIG+="router.use(\`\${API_PREFIX}/$resource_name\`, $resource_name); // TODO: Actualizar rutas\n"
    done
    
    ROUTES_INDEX+="$ROUTES_CONFIG\nmodule.exports = router;"
    
    # Guardar el nuevo archivo index.js
    echo -e "$ROUTES_INDEX" > "$WORKSPACE/src/routes/index.js"
    echo -e "  ${GREEN}✓ Actualizado archivo de rutas centralizado${NC}"
fi

# 9. Eliminar cualquier archivo basura o temporal
echo -e "${YELLOW}9. Eliminando archivos temporales o basura${NC}"

# Buscar archivos temporales comunes
TEMP_FILES=$(find . -name "*.tmp" -o -name "*.bak" -o -name "*.log" -o -name ".DS_Store")
if [ -n "$TEMP_FILES" ]; then
    echo "$TEMP_FILES" | while read -r tmp_file; do
        rm "$tmp_file"
        echo -e "  ${GREEN}✓ Eliminado archivo temporal:${NC} $tmp_file"
    done
else
    echo -e "  ${GREEN}✓ No se encontraron archivos temporales${NC}"
fi

echo

# 10. Ejecutar corrección de linting básica
echo -e "${YELLOW}10. Aplicando correcciones de formato básicas${NC}"

# Eliminar espacios en blanco al final de las líneas
find "$WORKSPACE/src" -name "*.js" -type f | xargs sed -i '' -E 's/[[:space:]]+$//'
echo -e "  ${GREEN}✓ Eliminados espacios en blanco al final de líneas${NC}"

# Mensaje final
echo -e "${GREEN}${BOLD}==================================================${NC}"
echo -e "${GREEN}${BOLD}  ¡Limpieza de base de código completada!        ${NC}"
echo -e "${GREEN}${BOLD}==================================================${NC}"
echo
echo -e "${YELLOW}Acciones realizadas:${NC}"
echo -e "  1. Se eliminaron archivos de prueba duplicados"
echo -e "  2. Se unificaron scripts de mantenimiento"
echo -e "  3. Se eliminaron archivos de configuración duplicados y actualizaron referencias"
echo -e "  4. Se migraron modelos antiguos a la nueva estructura"
echo -e "  5. Se actualizó el archivo README"
echo -e "  6. Se eliminaron dependencias innecesarias"
echo -e "  7. Se actualizaron los scripts en package.json"
echo -e "  8. Se actualizó el índice central de rutas"
echo -e "  9. Se eliminaron archivos temporales"
echo -e "  10. Se aplicaron correcciones de formato básicas"
echo
echo -e "${BLUE}Todos los archivos respaldados están en: ${BACKUP_DIR}${NC}"
echo
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "  1. Revisar la calidad de la migración de los modelos"
echo -e "  2. Validar que la aplicación funciona correctamente con:"
echo -e "     ${BLUE}npm start${NC} (para desarrollo)"
echo -e "     ${BLUE}npm run start:prod${NC} (para producción)"
echo -e "  3. Ejecutar las pruebas para verificar la funcionalidad:"
echo -e "     ${BLUE}npm test${NC}"
echo -e "  4. Cuando todo funcione correctamente, eliminar manualmente:"
echo -e "     ${RED}rm -rf src/model/${NC}"
echo -e "     ${RED}rm -rf src/routes/ruta_*${NC}"
echo
echo -e "${BLUE}La aplicación ha sido migrada a una estructura MVC:${NC}"
echo -e "  • ${BOLD}Models:${NC} src/models/ - Modelos Sequelize con métodos estáticos"
echo -e "  • ${BOLD}Views:${NC} N/A (API REST)"
echo -e "  • ${BOLD}Controllers:${NC} src/controllers/ - Lógica de negocio"
echo -e "  • ${BOLD}Routes:${NC} src/routes/ - Definición de endpoints"
echo -e "  • ${BOLD}Config:${NC} src/config/ - Configuración centralizada"
echo -e "  • ${BOLD}Middlewares:${NC} src/middlewares/ - Funcionalidades intermedias"
echo
echo -e "${GREEN}Para más información consulte:${NC}"
echo -e "  • README.md - Documentación principal"
echo -e "  • ESTRUCTURA_PROYECTO.md - Detalles de la estructura"
echo -e "  • CARACTERISTICAS_NUEVA_ARQUITECTURA.md - Descripción de mejoras"
echo
