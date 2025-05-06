-- Vista para búsquedas por IA
CREATE OR REPLACE VIEW vw_medicina AS
SELECT 
    p.idpoha, 
    p.preparado, 
    p.recomendacion,
    p.mate,
    p.terere,
    p.te,
    p.estado,
    GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR '|') AS dolencias,
    GROUP_CONCAT(DISTINCT pl.nombre SEPARATOR '|') AS plantas_nombres,
    GROUP_CONCAT(DISTINCT pl.nombre_cientifico SEPARATOR '|') AS plantas_cientificos,
    GROUP_CONCAT(DISTINCT pl.familia SEPARATOR '|') AS plantas_familias,
    GROUP_CONCAT(DISTINCT CONCAT_WS('|', pl.nombre, pl.nombre_cientifico, pl.familia, pl.subfamilia, pl.habitad_distribucion, pl.ciclo_vida, pl.fenologia) SEPARATOR '||') AS plantas_completo
FROM 
    poha p
LEFT JOIN dolencias_poha dp ON p.idpoha = dp.idpoha
LEFT JOIN dolencias d ON dp.iddolencias = d.iddolencias
LEFT JOIN poha_planta pp ON p.idpoha = pp.idpoha
LEFT JOIN planta pl ON pp.idplanta = pl.idplanta
WHERE 
    p.estado = 'AC'
GROUP BY 
    p.idpoha, p.preparado, p.recomendacion, p.mate, p.terere, p.te, p.estado;
