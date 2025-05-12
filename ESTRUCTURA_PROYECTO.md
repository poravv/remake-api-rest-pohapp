# Estructura del Proyecto POHAPP (API REST)

Este documento describe la nueva estructura del proyecto POHAPP API REST, después de la reorganización y limpieza del código.

## Estructura antigua

```
api-rest-pohapp-main/
├── src/                   # Código fuente principal
│   ├── model/            # Modelos de datos
│   ├── routes/           # Rutas de la API
│   ├── utils/            # Utilidades y funciones auxiliares
│   ├── config_rutas.js   # Configuración de rutas
│   ├── database.js       # Configuración de base de datos
│   └── server.js         # Punto de entrada principal
├── tests/                # Tests automatizados
│   ├── index.js          # Punto de entrada para tests
│   └── ...               # Archivos de prueba específicos
├── ONNX/                 # Modelos de IA en formato ONNX
├── docker/               # Archivos relacionados con Docker
├── .env                  # Variables de entorno (no incluir en git)
```

## Nueva estructura implementada

```
api-rest-pohapp-main/
├── src/                  # Código fuente principal
│   ├── config/           # Archivos de configuración
│   │   ├── config.js     # Configuración central de la aplicación
│   │   └── database.js   # Configuración de conexión a la base de datos
│   ├── controllers/      # Controladores (lógica de negocio)
│   ├── middlewares/      # Middlewares de Express
│   │   ├── errorMiddleware.js  # Manejo centralizado de errores
│   │   └── securityMiddleware.js # Seguridad y autenticación
│   ├── models/           # Modelos de datos mejorados
│   │   ├── index.js      # Centraliza relaciones entre modelos
│   │   └── *.js          # Definición de modelos individuales
│   ├── routes/           # Rutas de la API
│   │   ├── index.js      # Router central
│   │   └── *Routes.js    # Rutas individuales por recurso
│   ├── services/         # Servicios (lógica de negocio reutilizable)
│   ├── utils/            # Utilidades y funciones auxiliares
│   ├── app.js            # Configuración de la aplicación Express
│   └── server.js         # Punto de entrada principal
├── tests/                # Tests automatizados
├── ONNX/                 # Modelos de IA en formato ONNX
├── docker/               # Archivos relacionados con Docker
├── migrate_models.sh     # Script para migrar modelos del formato antiguo al nuevo
├── .env                  # Variables de entorno (no incluir en git)
├── .env.example          # Ejemplo de variables de entorno
├── package.json          # Dependencias y scripts
└── README.md             # Documentación principal
```

## Lineamientos para mantener el proyecto limpio

1. **Todos los archivos de prueba deben estar en la carpeta `/tests`**
   - No dejar archivos de prueba en la raíz del proyecto
   - Mantener una convención de nombres consistente (ej: `test_*.js`)

2. **Scripts de mantenimiento**
   - Ubicar en la raíz pero con nombre descriptivo
   - Documentar su propósito con comentarios al inicio

3. **Archivos obsoletos**
   - Mover a la carpeta `/archivos_obsoletos` antes de eliminarlos
   - Documentar por qué se consideran obsoletos

4. **Archivos temporales**
   - No incluir en control de versiones
   - Añadir extensiones a `.gitignore` (ej: `.tmp`, `.temp`, etc.)

5. **Gestión de dependencias**
   - Revisar regularmente dependencias no utilizadas
   - Mantener actualizado `package.json` eliminando scripts obsoletos

## Scripts de mantenimiento

El proyecto incluye dos scripts principales para mantener la organización:

- **reorganize_project.sh**: Script completo para reorganizar todos los archivos del proyecto
- **cleanup_files.sh**: Script ligero para eliminar archivos específicos innecesarios

## Recomendaciones para desarrolladores

- Antes de crear un nuevo archivo, verificar si ya existe algo similar
- Seguir las convenciones de nomenclatura ya establecidas
- Documentar adecuadamente cualquier nuevo script o utilidad
- Realizar revisiones periódicas para identificar y eliminar código duplicado o innecesario

---

> **NOTA**: Para más detalles sobre las características de la nueva arquitectura, consulte [CARACTERISTICAS_NUEVA_ARQUITECTURA.md](./CARACTERISTICAS_NUEVA_ARQUITECTURA.md)

Última actualización: 12-05-2025
