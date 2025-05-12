#!/bin/bash

# Script para crear controladores y rutas básicas
# Autor: Andres Vera
# Fecha: 12/05/2025

# Definición de colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

WORKSPACE="/Users/andresvera/Desktop/Proyectos/pohapp/actual/api-rest-pohapp-main"
cd "$WORKSPACE" || { echo "Error: No se pudo acceder al directorio del proyecto"; exit 1; }

# Lista de entidades a crear
ENTITIES=("poha" "dolencias" "dolencias_poha" "planta" "autor" "poha_planta" "usuario")

for entity in "${ENTITIES[@]}"; do
  echo -e "${YELLOW}Creando controlador y rutas para: ${entity}${NC}"
  
  # 1. Crear el controlador
  cat > "$WORKSPACE/src/controllers/${entity}Controller.js" << EOF
/**
 * Controlador para la entidad ${entity^}
 */
const { $(echo ${entity^}) } = require('../models');

/**
 * Obtiene todos los registros
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const registros = await ${entity^}.obtenerTodos();
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
    const registro = await ${entity^}.obtenerPorId(req.params.id);
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
    const nuevoRegistro = await ${entity^}.create(req.body);
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
    const [actualizado] = await ${entity^}.update(req.body, {
      where: { id: req.params.id }
    });
    
    if (actualizado) {
      const registroActualizado = await ${entity^}.obtenerPorId(req.params.id);
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
    const eliminado = await ${entity^}.destroy({
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

  # 2. Crear las rutas
  cat > "$WORKSPACE/src/routes/${entity}Routes.js" << EOF
/**
 * Rutas para la entidad ${entity^}
 */
const express = require('express');
const router = express.Router();
const ${entity}Controller = require('../controllers/${entity}Controller');

// Rutas GET
router.get('/', ${entity}Controller.obtenerTodos);
router.get('/:id', ${entity}Controller.obtenerPorId);

// Rutas POST
router.post('/', ${entity}Controller.crear);

// Rutas PUT
router.put('/:id', ${entity}Controller.actualizar);

// Rutas DELETE
router.delete('/:id', ${entity}Controller.eliminar);

module.exports = router;
EOF

  echo -e "${GREEN}✓ Creados ${entity}Controller.js y ${entity}Routes.js${NC}"
done

# Crear rutas para IA y medicinales (reexportaciones temporales)
cat > "$WORKSPACE/src/routes/iaRoutes.js" << EOF
/**
 * Reexportación temporal de las rutas de IA antiguas
 */
const iaRouter = require('./ruta_ia');
module.exports = iaRouter;
EOF

cat > "$WORKSPACE/src/routes/medicinalesRoutes.js" << EOF
/**
 * Reexportación temporal de las rutas de medicinales antiguas
 */
const medicinalesRouter = require('./ruta_medicinales');
module.exports = medicinalesRouter;
EOF

echo -e "${GREEN}✓ Creadas reexportaciones para rutas antiguas${NC}"

# Actualizar index.js para usar las nuevas rutas
cat > "$WORKSPACE/src/routes/index.js" << EOF
/**
 * Configuración central de rutas de la API
 */
const express = require('express');
const router = express.Router();

// Importar rutas de recursos
const puntosRoutes = require('./puntosRoutes');
const pohaRoutes = require('./pohaRoutes');
const dolencias_pohaRoutes = require('./dolencias_pohaRoutes');
const plantaRoutes = require('./plantaRoutes');
const autorRoutes = require('./autorRoutes');
const poha_plantaRoutes = require('./poha_plantaRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const dolenciasRoutes = require('./dolenciasRoutes');
const iaRoutes = require('./iaRoutes');
const medicinalesRoutes = require('./medicinalesRoutes');

// Definir prefijo base para las rutas API
const API_PREFIX = '/api/pohapp';

// Configurar rutas con sus respectivos prefijos
// Rutas nuevas
router.use(\`\${API_PREFIX}/puntos\`, puntosRoutes);
router.use(\`\${API_PREFIX}/poha\`, pohaRoutes);
router.use(\`\${API_PREFIX}/dolencias_poha\`, dolencias_pohaRoutes);
router.use(\`\${API_PREFIX}/planta\`, plantaRoutes);
router.use(\`\${API_PREFIX}/autor\`, autorRoutes);
router.use(\`\${API_PREFIX}/poha_planta\`, poha_plantaRoutes);
router.use(\`\${API_PREFIX}/usuario\`, usuarioRoutes);
router.use(\`\${API_PREFIX}/dolencias\`, dolenciasRoutes);
router.use(\`\${API_PREFIX}/ia\`, iaRoutes);
router.use(\`\${API_PREFIX}/medicinales\`, medicinalesRoutes);

module.exports = router;
EOF

echo -e "${GREEN}✓ Actualizado archivo index.js de rutas${NC}"
echo -e "${GREEN}¡Todos los controladores y rutas han sido creados con éxito!${NC}"
