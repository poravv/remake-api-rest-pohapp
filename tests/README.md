# Scripts de Prueba para la Integración ONNX en POHAPP

Este directorio contiene scripts para probar la integración de modelos ONNX en la aplicación POHAPP.

## Estructura de archivos

- `index.js` - Script principal para ejecutar todas las pruebas
- `test_init.js` - Prueba básica de inicialización de modelos
- `test_joblib.js` - Prueba del cargador de archivos joblib
- `test_models.js` - Prueba básica de modelos (validación e interpretación)
- `simple_test.js` - Prueba simplificada de validación de texto
- `interpret_test.js` - Prueba específica para interpretación de consultas
- `search_test.js` - Prueba específica para búsqueda por lenguaje natural
- `full_integration_test.js` - Prueba completa de integración
- `status-report.js` - Herramienta para generar un informe de estado

## Cómo ejecutar las pruebas

### Ejecutar una prueba específica

```bash
node index.js --test=full
```

Los nombres de pruebas disponibles son:
- `init` - Prueba de inicialización
- `joblib` - Prueba del cargador de joblib
- `models` - Prueba básica de modelos
- `simple` - Prueba simple de validación
- `interpret` - Prueba de interpretación
- `search` - Prueba de búsqueda
- `full` - Prueba completa de integración

### Generar un informe de estado

```bash
./status-report.js
```

Este comando verifica la disponibilidad de modelos, archivos de configuración y ejecuta una prueba básica de inicialización para generar un informe completo.

## Notas importantes

1. Las pruebas requieren un entorno Python con las dependencias instaladas:
   ```bash
   pip install joblib scikit-learn numpy
   ```

2. Los modelos ONNX deben estar disponibles en la carpeta `/ONNX` en la versión correcta.

3. Para que las pruebas de búsqueda funcionen en un entorno real, debe configurarse correctamente la base de datos en `.env`.

## Solución de problemas

Si encuentra problemas al ejecutar las pruebas:

1. Verifique que los modelos existan en la ubicación correcta
2. Asegúrese de tener Python y las dependencias instaladas
3. Compruebe que la configuración de fallback esté correcta en `model_config.js`
4. Revise que las dimensiones de entrada del modelo coincidan con las esperadas

## Ejemplos de uso

### Probar la inicialización de modelos

```bash
node index.js --test=init
```

### Ejecutar la prueba completa de integración

```bash
node index.js --test=full
```

### Obtener un informe completo del estado

```bash
./status-report.js
```
