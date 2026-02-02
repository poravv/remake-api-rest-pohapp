const express = require('express')
const ruta = express.Router();
const poha = require('../model/poha')
const dolencias_poha = require('../model/dolencias_poha');
const poha_planta = require('../model/poha_planta');
const autor = require('../model/autor');
const planta = require('../model/planta');
const dolencias = require('../model/dolencias');
const usuario = require('../model/usuario');
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
    // Solo devolver remedios activos (estado = 'AC')
    await poha.findAll({
        where: { estado: 'AC' },
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
    try {
        const page = parseInt(req.query.page) || 0;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = page * pageSize;

        const iddolencias = parseInt(req.params.iddolencias) || 0;
        const idplanta = parseInt(req.params.idplanta) || 0;
        const te = parseInt(req.params.te) || 0;
        const mate = parseInt(req.params.mate) || 0;
        const terere = parseInt(req.params.terere) || 0;

        // Fase 1: Obtener IDs de poha que coinciden con los filtros
        // Solo remedios activos
        const whereConditions = [{ estado: 'AC' }];
        if (te !== 0) whereConditions.push({ te: te });
        if (mate !== 0) whereConditions.push({ mate: mate });
        if (terere !== 0) whereConditions.push({ terere: terere });

        const includesForFilter = [];
        
        if (idplanta !== 0) {
            includesForFilter.push({
                model: poha_planta,
                required: true,
                attributes: [],
                include: [{
                    model: planta,
                    required: true,
                    attributes: [],
                    where: { idplanta: idplanta }
                }]
            });
        }
        
        if (iddolencias !== 0) {
            includesForFilter.push({
                model: dolencias_poha,
                required: true,
                attributes: [],
                include: [{
                    model: dolencias,
                    required: true,
                    attributes: [],
                    where: { iddolencias: iddolencias }
                }]
            });
        }

        const matchingPohas = await poha.findAll({
            attributes: ['idpoha'],
            include: includesForFilter,
            where: whereConditions.length > 0 ? { [Op.and]: whereConditions } : {},
            limit: pageSize,
            offset: offset,
            raw: true
        });

        const matchingIds = matchingPohas.map(p => p.idpoha);

        if (matchingIds.length === 0) {
            return res.json([]);
        }

        // Fase 2: Cargar los poha encontrados con TODAS sus relaciones
        const fullPohas = await poha.findAll({
            where: { idpoha: { [Op.in]: matchingIds } },
            include: [
                { model: autor },
                { model: poha_planta, include: [{ model: planta }] },
                { model: dolencias_poha, include: [{ model: dolencias }] }
            ]
        });

        res.json(fullPohas);
    } catch (error) {
        console.error('Error en getindex:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
})

ruta.get('/get/:iddolencias/:te/:mate/:terere/:idplanta', async (req, res) => {
    try {
        const iddolencias = parseInt(req.params.iddolencias) || 0;
        const idplanta = parseInt(req.params.idplanta) || 0;
        const te = parseInt(req.params.te) || 0;
        const mate = parseInt(req.params.mate) || 0;
        const terere = parseInt(req.params.terere) || 0;

        // Fase 1: Obtener IDs de poha que coinciden con los filtros
        // Solo remedios activos
        const whereConditions = [{ estado: 'AC' }];
        if (te !== 0) whereConditions.push({ te: te });
        if (mate !== 0) whereConditions.push({ mate: mate });
        if (terere !== 0) whereConditions.push({ terere: terere });

        const includesForFilter = [];
        
        if (idplanta !== 0) {
            includesForFilter.push({
                model: poha_planta,
                required: true,
                attributes: [],
                include: [{
                    model: planta,
                    required: true,
                    attributes: [],
                    where: { idplanta: idplanta }
                }]
            });
        }
        
        if (iddolencias !== 0) {
            includesForFilter.push({
                model: dolencias_poha,
                required: true,
                attributes: [],
                include: [{
                    model: dolencias,
                    required: true,
                    attributes: [],
                    where: { iddolencias: iddolencias }
                }]
            });
        }

        const matchingPohas = await poha.findAll({
            attributes: ['idpoha'],
            include: includesForFilter,
            where: whereConditions.length > 0 ? { [Op.and]: whereConditions } : {},
            raw: true
        });

        const matchingIds = matchingPohas.map(p => p.idpoha);

        if (matchingIds.length === 0) {
            return res.json([]);
        }

        // Fase 2: Cargar los poha encontrados con TODAS sus relaciones
        const fullPohas = await poha.findAll({
            where: { idpoha: { [Op.in]: matchingIds } },
            include: [
                { model: autor },
                { model: poha_planta, include: [{ model: planta }] },
                { model: dolencias_poha, include: [{ model: dolencias }] }
            ]
        });

        res.json(fullPohas);
    } catch (error) {
        console.error('Error en get con filtros:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
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
        // Determinar estado según rol del usuario
        let estado = 'PE'; // Por defecto, pendiente de aprobación
        const { idusuario } = req.body || {};
        if (idusuario) {
            const user = await usuario.findByPk(idusuario);
            if (user && user.isAdmin === 1) {
                estado = 'AC'; // Admin: activo directamente
            }
        }

        // 1. Guardar poha con el estado determinado
        const pohaData = { ...req.body, estado };
        const nuevoPoha = await poha.create(pohaData);

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

// ============================================================
// ENDPOINTS DE MODERACIÓN
// ============================================================

// Listar remedios pendientes de aprobación (solo para admin)
ruta.get('/pendientes', async (req, res) => {
    try {
        const { idusuario } = req.query;
        
        // Verificar que es admin
        if (!idusuario) {
            return res.status(400).json({ error: 'idusuario requerido' });
        }
        
        const user = await usuario.findByPk(idusuario);
        if (!user || user.isAdmin !== 1) {
            return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
        }

        const pendientes = await poha.findAll({ 
            where: { estado: 'PE' },
            include: [
                { model: autor },
                { model: poha_planta, include: [{ model: planta }] },
                { model: dolencias_poha, include: [{ model: dolencias }] }
            ],
            order: [['idpoha', 'DESC']]
        });
        res.json(pendientes);
    } catch (error) {
        console.error('Error obteniendo remedios pendientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Aprobar remedio pendiente (cambiar estado de PE a AC)
ruta.put('/aprobar/:idpoha', async (req, res) => {
    try {
        const { idusuario } = req.body || {};
        
        // Verificar que es admin
        if (!idusuario) {
            return res.status(400).json({ error: 'idusuario requerido' });
        }
        
        const user = await usuario.findByPk(idusuario);
        if (!user || user.isAdmin !== 1) {
            return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
        }

        const result = await poha.update(
            { estado: 'AC' }, 
            { where: { idpoha: req.params.idpoha, estado: 'PE' } }
        );
        
        if (result[0] === 0) {
            return res.status(404).json({ error: 'Remedio no encontrado o ya aprobado' });
        }

        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json({ message: 'Remedio aprobado exitosamente', affected: result[0] });
    } catch (error) {
        console.error('Error aprobando remedio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rechazar remedio pendiente (marcar como inactivo)
ruta.put('/rechazar/:idpoha', async (req, res) => {
    try {
        const { idusuario } = req.body || {};
        
        // Verificar que es admin
        if (!idusuario) {
            return res.status(400).json({ error: 'idusuario requerido' });
        }
        
        const user = await usuario.findByPk(idusuario);
        if (!user || user.isAdmin !== 1) {
            return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
        }

        const result = await poha.update(
            { estado: 'IN' }, 
            { where: { idpoha: req.params.idpoha, estado: 'PE' } }
        );
        
        if (result[0] === 0) {
            return res.status(404).json({ error: 'Remedio no encontrado o ya procesado' });
        }

        invalidateByPrefix('poha');
        invalidateByPrefix('medicinales');
        res.json({ message: 'Remedio rechazado', affected: result[0] });
    } catch (error) {
        console.error('Error rechazando remedio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


module.exports = ruta;
