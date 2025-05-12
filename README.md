# POHAPP - API REST

API REST para la aplicación Poha ÑanApp con integración de modelos de IA.

> **ACTUALIZACÍÓN IMPORTANTE:** El proyecto ha sido reorganizado siguiendo una estructura MVC para mejorar la mantenibilidad y escalabilidad. Consulte [ESTRUCTURA_PROYECTO.md](./ESTRUCTURA_PROYECTO.md) para obtener detalles sobre la nueva organización.

## Características principales

- API RESTful para la gestión de plantas medicinales y remedios tradicionales
- Integración con modelos de IA para búsquedas inteligentes y procesamiento de lenguaje natural
- Arquitectura MVC con separación clara de responsabilidades
- Manejo centralizado de errores y validaciones
- Autenticación y autorización mediante firmas HMAC

## Configuración del entorno

1. Clonar el repositorio:

```bash
git clone https://github.com/username/api-rest-pohapp.git
cd api-rest-pohapp
```

2. Instalar dependencias:

```bash
npm install
```

3. Configurar variables de entorno:

```bash
cp .env.example .env
```

Editar el archivo `.env` con los valores correspondientes a tu entorno.

## Ejecución del proyecto

Para iniciar el servidor en modo desarrollo:

```bash
npm start
```

## Estructura del proyecto

La API sigue una estructura MVC (Modelo-Vista-Controlador):

```
/src
  /config           # Configuraciones
  /controllers      # Controladores 
  /middlewares      # Middlewares
  /models           # Modelos de datos
  /routes           # Rutas de la API
  /services         # Servicios
  /utils            # Utilidades
  app.js            # Configuración Express
  server.js         # Punto de entrada
```

Para más detalles, consulte [ESTRUCTURA_PROYECTO.md](./ESTRUCTURA_PROYECTO.md).

## Nuevas funcionalidades de IA

La API incluye capacidades de búsqueda por lenguaje natural y validación de textos utilizando modelos de machine learning (ONNX).

### Versión de modelos de IA

Esta implementación corresponde a la versión del modelo v20250504 (Mayo 2025).

### Características implementadas

1. **Validación de textos**: Verifica si un texto es adecuado/válido.
2. **Interpretación de consultas**: Traduce consultas en lenguaje natural a categorías.
3. **Búsqueda inteligente**: Permite realizar búsquedas usando lenguaje natural.

## Principales endpoints

### Plantas

- `GET /api/pohapp/planta`: Obtener todas las plantas
- `GET /api/pohapp/planta/:idplanta`: Obtener una planta por ID
- `GET /api/pohapp/planta/buscar/:nombre`: Buscar plantas por nombre
- `POST /api/pohapp/planta`: Crear una nueva planta
- `PUT /api/pohapp/planta/:idplanta`: Actualizar una planta
- `DELETE /api/pohapp/planta/:idplanta`: Eliminar una planta

### IA - Endpoints

#### Validación de texto
```
POST /api/pohapp/ia/validar
```
**Body:**
```json
{
  "texto": "El texto a validar"
}
```

#### Interpretación de consultas
```
POST /api/pohapp/ia/interpretar
```
**Body:**
```json
{
  "consulta": "Consulta en lenguaje natural"
}
```

#### Búsqueda inteligente
```
GET /api/pohapp/ia/buscar?q=tu consulta
```

## Migración desde la estructura antigua

Si está trabajando con la versión anterior del proyecto, puede utilizar el script de migración para adaptarse a la nueva estructura:

```bash
./migrate_models.sh
```

Este script:
- Migra modelos de `/src/model` a `/src/models`
- Genera controladores en `/src/controllers`
- Crea archivos de rutas en `/src/routes`

## Tests

Para ejecutar las pruebas:

```bash
npm test
```

Para ejecutar pruebas específicas:

```bash
npm run test:models
npm run test:search
```

## Documentación adicional

- [Características de la nueva arquitectura](./CARACTERISTICAS_NUEVA_ARQUITECTURA.md)
- [Estructura del proyecto](./ESTRUCTURA_PROYECTO.md)

## Licencia

ISC - Andres Vera
