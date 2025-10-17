-- Script para actualizar las URLs completas de MinIO a solo nombres de archivo
-- Detectamos 3 formatos diferentes:
-- 1. https://minpoint.mindtechpy.net/bucket-pohapp/FILENAME
-- 2. https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/objects/download?preview=true&prefix=FILENAME
-- 3. URLs ya con solo el nombre del archivo

-- Ver datos actuales (primeros 10 registros)
SELECT idplanta, nombre, img 
FROM planta 
LIMIT 10;

-- Actualizar FORMATO 1: https://minpoint.mindtechpy.net/bucket-pohapp/
UPDATE planta 
SET img = REPLACE(img, 'https://minpoint.mindtechpy.net/bucket-pohapp/', '')
WHERE img LIKE 'https://minpoint.mindtechpy.net/bucket-pohapp/%';

-- Actualizar FORMATO 2: https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/objects/download?preview=true&prefix=
UPDATE planta 
SET img = REPLACE(img, 'https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/objects/download?preview=true&prefix=', '')
WHERE img LIKE 'https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/%';

-- Verificar resultados
SELECT idplanta, nombre, img 
FROM planta 
LIMIT 10;

-- Mostrar estadísticas finales
SELECT 
    COUNT(*) as total_plantas,
    SUM(CASE WHEN img LIKE 'http%' THEN 1 ELSE 0 END) as con_url_completa,
    SUM(CASE WHEN img NOT LIKE 'http%' AND img IS NOT NULL THEN 1 ELSE 0 END) as solo_nombre_archivo,
    SUM(CASE WHEN img IS NULL THEN 1 ELSE 0 END) as sin_imagen
FROM planta;
