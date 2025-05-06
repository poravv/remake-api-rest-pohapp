# POHAPP - API REST

API REST para la aplicación Poha ÑanApp con integración de modelos de IA.

## Nuevas funcionalidades de IA

La API ahora incluye capacidades de búsqueda por lenguaje natural y validación de textos utilizando modelos de machine learning (ONNX).

## Versión

Esta implementación corresponde a la versión del modelo v20250504 (Mayo 2025).

### Características implementadas

1. **Validación de textos**: Verifica si un texto es adecuado/válido.
2. **Interpretación de consultas**: Traduce consultas en lenguaje natural a categorías.
3. **Búsqueda inteligente**: Permite realizar búsquedas usando lenguaje natural.

## Endpoints de IA

### Validación de texto
```
POST /api/pohapp/ia/validar
```
**Body:**
```json
{
  "texto": "El texto a validar"
}
```
**Respuesta:**
```json
{
  "success": true,
  "isValid": true,
  "confidence": 0.95,
  "score": 0.95
}
```

### Búsqueda en lenguaje natural
```
GET /api/pohapp/ia/buscar?consulta=tengo dolor de cabeza
```
**Respuesta:**
```json
{
  "success": true,
  "interpretedCategory": "dolor de cabeza",
  "confidence": 0.87,
  "results": [...],
  "totalResults": 5
}
```

### Interpretar consulta
```
GET /api/pohapp/ia/interpretar?consulta=tengo dolor de cabeza
```
**Respuesta:**
```json
{
  "success": true,
  "categoryId": 4,
  "categoryName": "dolor de cabeza",
  "confidence": 0.87
}
```

### Búsqueda en ruta medicinales
```
GET /api/pohapp/medicinales/busqueda-natural/tengo dolor de cabeza
```

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
```bash
npm install
```
3. Verificar que los modelos ONNX estén en la carpeta `/ONNX`
4. Instalar las dependencias de Python necesarias:
```bash
pip install joblib scikit-learn numpy
```
5. Iniciar el servidor:
```bash
npm start
```

## Prueba de modelos

Puedes probar los modelos con el script incluido:
```bash
node test_models.js
```

## Dependencias principales

- Express: Framework web
- Sequelize: ORM para base de datos
- ONNX Runtime: Para ejecutar modelos de machine learning
- Node-joblib: Para cargar artefactos de Python

## Seguridad y optimizaciones

### Limitación de velocidad (Rate Limiting)
La API implementa limitación de velocidad para prevenir abusos:
- 100 peticiones por IP cada 15 minutos

### Caché
Los resultados de búsqueda se almacenan en caché para mejorar el rendimiento:
- TTL (tiempo de vida): 24 horas
- Tamaño máximo: 500 entradas
- Limpieza automática de caché cada hora

### Endpoints administrativos
Los endpoints administrativos requieren autenticación mediante firma HMAC:
- API Key
- API Secret
- Firma basada en timestamp + ruta + cuerpo

### Validación de entradas
Todas las entradas de usuario están validadas y limitadas en tamaño.

## Ejemplos de cliente

La carpeta `/examples` contiene ejemplos de uso de la API desde aplicaciones cliente.

```javascript
// Ejemplo de búsqueda con lenguaje natural
async function buscarRemedios(consulta) {
  const response = await fetch(`/api/pohapp/ia/buscar?consulta=${encodeURIComponent(consulta)}`);
  const result = await response.json();
  return result;
}
```
