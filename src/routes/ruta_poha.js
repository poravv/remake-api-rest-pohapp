const express = require('express')
const ruta = express.Router();
const poha = require('../model/poha')
const dolencias_poha = require('../model/dolencias_poha');
const poha_planta = require('../model/poha_planta');
const autor = require('../model/autor');
const planta = require('../model/planta');
const dolencias = require('../model/dolencias');
const { Op } = require('sequelize');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sequelize = require('../database');
const { invalidateByPrefix } = require('../middleware/cache');

const parsePagination = (req, res) => {
    const hasPage = req.query.page !== undefined;
    const hasPageSize = req.query.pageSize !== undefined;
    if (!hasPage && !hasPageSize) return null;

    const page = hasPage ? parseInt(req.query.page, 10) : 0;
    const pageSize = hasPageSize ? parseInt(req.query.pageSize, 10) : 20;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 0 || pageSize <= 0) {
        res.status(400).json({ error: 'paginacion invalida' });
        return null;
    }

    return {
        limit: pageSize,
        offset: page * pageSize,
    };
};

ruta.get('/count/', async (req, res) => {
    await poha.count().then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/', async (req, res) => {
    const pagination = parsePagination(req, res);
    if (pagination === null && (req.query.page !== undefined || req.query.pageSize !== undefined)) {
        return;
    }
    await poha.findAll({
        ...(pagination || {}),
        include: [
            { model: autor },
            { model: poha_planta, include: [{ model: planta }] },
            { model: dolencias_poha, include: [{ model: dolencias }] }
        ],
        distinct: true,
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})


ruta.get('/getindex/:iddolencias/:te/:mate/:terere/:idplanta', async (req, res) => {

    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.pageSize) || 10;
    // Calcula el offset
    const offset = (page) * pageSize;

    await poha.findAll({
        limit: pageSize, offset: offset,
        include: [
            { model: autor, },
            {
                model: poha_planta, required: true, separate: true, include: [{
                    model: planta,
                    required: true,
                    where: {
                        [Op.and]: [
                            req.params.idplanta != 0 ? { idplanta: req.params.idplanta } : 0 == 0
                        ],
                    },
                }]
            },
            {
                model: dolencias_poha, required: true, separate: true, include: [{
                    model: dolencias,
                    required: true,
                    where: {
                        [Op.and]: [
                            req.params.iddolencias != 0 ? { iddolencias: req.params.iddolencias } : 0 == 0
                        ],
                    },
                }]
            }
        ],
        where: {
            [Op.and]: [
                req.params.te != 0 ? { te: req.params.te } : 0 == 0,
                req.params.mate != 0 ? { mate: req.params.mate } : 0 == 0,
                req.params.terere != 0 ? { terere: req.params.terere } : 0 == 0,
            ],
        }
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/:iddolencias/:te/:mate/:terere/:idplanta', async (req, res) => {
    await poha.findAll({
        include: [
            { model: autor },
            {
                model: poha_planta, required: true, include: [{
                    model: planta,
                    required: true,
                    where: {
                        [Op.and]: [
                            req.params.idplanta != 0 ? { idplanta: req.params.idplanta } : 0 == 0
                        ],
                    },
                }]
            },
            {
                model: dolencias_poha, required: true, include: [{
                    model: dolencias,
                    required: true,
                    where: {
                        [Op.and]: [
                            req.params.iddolencias != 0 ? { iddolencias: req.params.iddolencias } : 0 == 0
                        ],
                    },
                }]
            }
        ],
        where: {
            [Op.and]: [
                req.params.te != 0 ? { te: req.params.te } : 0 == 0,
                req.params.mate != 0 ? { mate: req.params.mate } : 0 == 0,
                req.params.terere != 0 ? { terere: req.params.terere } : 0 == 0,
            ],
        }
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/:idpoha', async (req, res) => {
    await poha.findByPk(req.params.idpoha, {
        include: [
            { model: autor },
            { model: poha_planta, include: [{ model: planta }] },
            { model: dolencias_poha, include: [{ model: dolencias }] }
        ]
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.post('/post/', async (req, res) => {
    try {
        // 1. Guardar poha
        const nuevoPoha = await poha.create(req.body);

        // 2. Esperar a que se actualicen las vistas, o volver a consultar los datos enriquecidos
        const [datos] = await sequelize.query(`
        SELECT p.idpoha, CONCAT_WS('. ',
            CONCAT('Esta preparación es útil para tratar: ', GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ')),
            CONCAT('Modo de preparación sugerido: ', MAX(p.preparado)),
            CONCAT('Precauciones: ', IFNULL(MAX(p.recomendacion), 'Ninguna advertencia importante.')),
            CONCAT('Esta mezcla contiene las siguientes plantas: ',
                GROUP_CONCAT(
                    DISTINCT CONCAT(pl.nombre, ' (', pl.nombre_cientifico, ', familia ', pl.familia, ')')
                )
            ),
            CONCAT('Detalles adicionales de cada planta: ',
                GROUP_CONCAT(
                    DISTINCT CONCAT_WS('. ',
                        pl.nombre,
                        pl.descripcion,
                        CONCAT('Hábitat: ', pl.habitad_distribucion),
                        CONCAT('Ciclo de vida: ', pl.ciclo_vida)
                    )
                )
            )
        ) AS texto_entrenamiento
        FROM poha p
        LEFT JOIN dolencias_poha dp ON p.idpoha = dp.idpoha
        LEFT JOIN dolencias d ON d.iddolencias = dp.iddolencias
        LEFT JOIN poha_planta pp ON p.idpoha = pp.idpoha
        LEFT JOIN planta pl ON pl.idplanta = pp.idplanta
        WHERE p.idpoha = ?
        GROUP BY p.idpoha
        `, { replacements: [nuevoPoha.idpoha] });


        const textoEntrenamiento = datos[0]?.texto_entrenamiento;

        if (!textoEntrenamiento) {
            return res.status(400).json({ error: 'No se pudo generar texto de entrenamiento.' });
        }

        // 3. Crear embedding
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: textoEntrenamiento,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // 4. Guardar en medicina_embeddings
        await sequelize.query(`
        INSERT INTO medicina_embeddings (idpoha, resumen, embedding)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE resumen = VALUES(resumen), embedding = VALUES(embedding)
        `, {
                replacements: [nuevoPoha.idpoha, textoEntrenamiento, JSON.stringify(embedding)],
            });

        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json({ ...nuevoPoha.toJSON(), embeddingGuardado: true });

    } catch (error) {
        console.error('❌ Error al guardar poha con embedding:', error);
        res.status(500).json({ error: 'Error interno al guardar poha y generar embedding' });
    }
});

ruta.put('/put/:idpoha', async (req, res) => {
    await poha.update(req.body, { where: { idpoha: req.params.idpoha } }).then((response) => {
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:idpoha', async (req, res) => {

    await poha_planta.destroy({
        where: {
            idpoha: req.params.idpoha,
        }
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });

    await dolencias_poha.destroy({
        where: {
            idpoha: req.params.idpoha,
        }
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });

    await poha.destroy({ where: { idpoha: req.params.idpoha } }).then((response) => {
        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error);
        console.log(`Algo salió mal ${error}`);
    });

})


module.exports = ruta;
