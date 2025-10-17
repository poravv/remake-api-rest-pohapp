CREATE TABLE medicina_embeddings (
  idpoha INT PRIMARY KEY,
  resumen TEXT,
  embedding JSON
);


CREATE OR REPLACE VIEW vw_medicina_entrenamiento AS
SELECT 
    p.idpoha,
    GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ') AS dolencias,
    GROUP_CONCAT(DISTINCT pl.nombre SEPARATOR ', ') AS plantas,
    GROUP_CONCAT(DISTINCT pl.nombre_cientifico SEPARATOR ', ') AS cientificos,
    GROUP_CONCAT(DISTINCT pl.familia SEPARATOR ', ') AS familias,

    -- Texto enriquecido para embeddings
    CONCAT_WS('. ',
        CONCAT('Esta preparación es útil para tratar: ', GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ')),
        CONCAT('Modo de preparación sugerido: ', MAX(p.preparado)),
        CONCAT('Precauciones: ', IFNULL(MAX(p.recomendacion), 'Ninguna advertencia importante.')),
        CONCAT('Esta mezcla contiene las siguientes plantas: ',
            GROUP_CONCAT(
                DISTINCT CONCAT(pl.nombre, ' (', pl.nombre_cientifico, ', familia ', pl.familia, ')')
                SEPARATOR ', '
            )
        ),
        CONCAT('Detalles adicionales de cada planta: ',
            GROUP_CONCAT(
                DISTINCT CONCAT_WS('. ',
                    pl.nombre,
                    pl.descripcion,
                    CONCAT('Hábitat: ', pl.habitad_distribucion),
                    CONCAT('Ciclo de vida: ', pl.ciclo_vida)
                ) SEPARATOR '. '
            )
        )
    ) AS texto_entrenamiento,

    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'nombre', subpl.nombre,
          'nombre_cientifico', subpl.nombre_cientifico,
          'familia', subpl.familia,
          'imagen', subpl.img
        )
      )
      FROM (
        SELECT DISTINCT pl.idplanta, pl.nombre, pl.nombre_cientifico, pl.familia, pl.img
        FROM poha_planta pp2
        JOIN planta pl ON pl.idplanta = pp2.idplanta
        WHERE pp2.idpoha = p.idpoha AND pl.img IS NOT NULL AND pl.img <> ''
      ) AS subpl
    ) AS plantas_detalle_json

FROM poha p
LEFT JOIN dolencias_poha dp ON p.idpoha = dp.idpoha AND p.idusuario = dp.idusuario
LEFT JOIN dolencias d ON d.iddolencias = dp.iddolencias
LEFT JOIN poha_planta pp ON p.idpoha = pp.idpoha AND p.idusuario = pp.idusuario
LEFT JOIN planta pl ON pl.idplanta = pp.idplanta
WHERE p.estado = 'AC'
GROUP BY p.idpoha;


CREATE TABLE chat_historial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idusuario VARCHAR(200) NOT NULL,
  pregunta TEXT,
  respuesta TEXT,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  idpoha_json JSON,
  imagenes_json JSON
);


--Query final
CREATE OR REPLACE VIEW vw_medicina_entrenamiento AS
SELECT 
    p.idpoha,
    GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ') AS dolencias,
    GROUP_CONCAT(DISTINCT pl.nombre SEPARATOR ', ') AS plantas,
    GROUP_CONCAT(DISTINCT pl.nombre_cientifico SEPARATOR ', ') AS cientificos,
    GROUP_CONCAT(DISTINCT pl.familia SEPARATOR ', ') AS familias,

    -- Texto enriquecido para embeddings
    CONCAT_WS('. ',
        CONCAT('Esta preparación es útil para tratar: ', GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ')),
        CONCAT('Dolencias mencionadas: ', GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ')),
        CONCAT('Modo de preparación sugerido: ', MAX(p.preparado)),
        CONCAT('Precauciones: ', IFNULL(MAX(p.recomendacion), 'Ninguna advertencia importante.')),
        CONCAT('Esta mezcla contiene las siguientes plantas: ',
            GROUP_CONCAT(
                DISTINCT CONCAT(pl.nombre, ' (', pl.nombre_cientifico, ', familia ', pl.familia, ')')
                SEPARATOR ', '
            )
        ),
        CONCAT('Detalles adicionales de cada planta: ',
            GROUP_CONCAT(
                DISTINCT CONCAT_WS('. ',
                    pl.nombre,
                    pl.descripcion,
                    CONCAT('Hábitat: ', pl.habitad_distribucion),
                    CONCAT('Ciclo de vida: ', pl.ciclo_vida)
                ) SEPARATOR '. '
            )
        )
    ) AS texto_entrenamiento,

    -- JSON de plantas
    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'nombre', subpl.nombre,
          'nombre_cientifico', subpl.nombre_cientifico,
          'familia', subpl.familia,
          'imagen', subpl.img
        )
      )
      FROM (
        SELECT DISTINCT pl.idplanta, pl.nombre, pl.nombre_cientifico, pl.familia, pl.img
        FROM poha_planta pp2
        JOIN planta pl ON pl.idplanta = pp2.idplanta
        WHERE pp2.idpoha = p.idpoha AND pl.img IS NOT NULL AND pl.img <> ''
      ) AS subpl
    ) AS plantas_detalle_json

FROM poha p
LEFT JOIN dolencias_poha dp ON p.idpoha = dp.idpoha AND p.idusuario = dp.idusuario
LEFT JOIN dolencias d ON d.iddolencias = dp.iddolencias
LEFT JOIN poha_planta pp ON p.idpoha = pp.idpoha AND p.idusuario = pp.idusuario
LEFT JOIN planta pl ON pl.idplanta = pp.idplanta
WHERE p.estado = 'AC'
GROUP BY p.idpoha;
