const express = require('express')
const ruta = express.Router();
const dolencias = require('../model/dolencias')
const usuario = require('../model/usuario')
const database = require('../database')
const { QueryTypes } = require('sequelize');
const { invalidateByPrefix } = require('../middleware/cache');

ruta.use((req, res, next) => {
    if (req.params && req.params.iddolencias !== undefined) {
        const id = parseInt(req.params.iddolencias, 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'iddolencias invalido' });
        }
    }
    next();
});

const isNonEmptyString = (value) =>
    typeof value === 'string' && value.trim().length > 0;

const parsePagination = (req, res) => {
    const hasPage = req.query.page !== undefined;
    const hasPageSize = req.query.pageSize !== undefined;
    if (!hasPage && !hasPageSize) return null;

    const page = hasPage ? parseInt(req.query.page, 10) : 0;
    const pageSize = hasPageSize ? parseInt(req.query.pageSize, 10) : 50;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 0 || pageSize <= 0) {
        res.status(400).json({ error: 'paginacion invalida' });
        return null;
    }

    return {
        limit: pageSize,
        offset: page * pageSize,
    };
};

ruta.get('/getsql/:descripcion', async (req, res) => {
    const descripcion = (req.params.descripcion || '').trim();
    if (!descripcion) {
        return res.status(400).json({ error: 'descripcion requerida' });
    }
    await database
        .query(
            'select * from dolencias where upper(descripcion) like upper(:descripcion)',
            { replacements: { descripcion: `%${descripcion}%` }, type: QueryTypes.SELECT },
        )
        .then((response) => {
            res.json(response);
        })
        .catch((error) => {
            console.error(error);
            console.log(`Algo salió mal ${error}`);
        });
})

ruta.get('/usage', async (req, res) => {
    try {
        const query = `
            SELECT 
                d.iddolencias,
                d.descripcion,
                d.estado,
                COUNT(DISTINCT dp.idpoha) AS poha_count
            FROM dolencias d
            LEFT JOIN dolencias_poha dp ON dp.iddolencias = d.iddolencias
            GROUP BY d.iddolencias, d.descripcion, d.estado
        `;

        const response = await database.query(query, { type: QueryTypes.SELECT });
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo uso de dolencias' });
    }
});

ruta.get('/get/', async (req, res) => {
    const pagination = parsePagination(req, res);
    if (pagination === null && (req.query.page !== undefined || req.query.pageSize !== undefined)) {
        return;
    }
    await dolencias.findAll({ 
        where: { estado: 'AC' },
        ...(pagination || {}) 
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/:iddolencias', async (req, res) => {
    await dolencias.findByPk(req.params.iddolencias).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.post('/post/', async (req, res) => {
    try {
        const { descripcion, idusuario } = req.body || {};
        if (!isNonEmptyString(descripcion)) {
            return res.status(400).json({ error: 'descripcion es requerida' });
        }

        // Determinar estado según rol del usuario
        let estado = 'PE'; // Por defecto, pendiente de aprobación
        if (idusuario) {
            const user = await usuario.findByPk(idusuario);
            if (user && user.isAdmin === 1) {
                estado = 'AC'; // Admin: activo directamente
            }
        }

        const dolenciaData = { ...req.body, estado };
        await dolencias.create(dolenciaData).then((response) => {
            invalidateByPrefix('dolencias');
            invalidateByPrefix('medicinales');
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            console.log(`Algo salió mal ${error}`);
        });
    } catch (error) {
        console.log(`Algo salió mal ${error}`);
    }
})

ruta.put('/put/:iddolencias', async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'body requerido' });
    }
    await dolencias.update(req.body, { where: { iddolencias: req.params.iddolencias } }).then((response) => {
        invalidateByPrefix('dolencias');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:iddolencias', async (req, res) => {
    await dolencias.destroy({ where: { iddolencias: req.params.iddolencias } }).then((response) => {
        invalidateByPrefix('dolencias');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

// ============================================================
// ENDPOINTS DE MODERACIÓN (solo admin)
// ============================================================

ruta.get('/pendientes', async (req, res) => {
    try {
        const { idusuario } = req.query;
        if (!idusuario) {
            return res.status(400).json({ error: 'idusuario requerido' });
        }

        // Verificar que el usuario es admin
        const user = await usuario.findByPk(idusuario);
        if (!user || user.isAdmin !== 1) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const pendientes = await dolencias.findAll({
            where: { estado: 'PE' },
            order: [['iddolencias', 'DESC']]
        });

        res.json(pendientes);
    } catch (error) {
        console.error('Error obteniendo dolencias pendientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

ruta.put('/aprobar/:iddolencias', async (req, res) => {
    try {
        const { idusuario } = req.body;
        if (!idusuario) {
            return res.status(400).json({ error: 'idusuario requerido' });
        }

        // Verificar que el usuario es admin
        const user = await usuario.findByPk(idusuario);
        if (!user || user.isAdmin !== 1) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const [updated] = await dolencias.update(
            { estado: 'AC' },
            { where: { iddolencias: req.params.iddolencias, estado: 'PE' } }
        );

        if (updated === 0) {
            return res.status(404).json({ error: 'Dolencia no encontrada o ya procesada' });
        }

        invalidateByPrefix('dolencias');
        invalidateByPrefix('medicinales');
        res.json({ message: 'Dolencia aprobada', iddolencias: req.params.iddolencias });
    } catch (error) {
        console.error('Error aprobando dolencia:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

ruta.put('/rechazar/:iddolencias', async (req, res) => {
    try {
        const { idusuario } = req.body;
        if (!idusuario) {
            return res.status(400).json({ error: 'idusuario requerido' });
        }

        // Verificar que el usuario es admin
        const user = await usuario.findByPk(idusuario);
        if (!user || user.isAdmin !== 1) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const [updated] = await dolencias.update(
            { estado: 'IN' },
            { where: { iddolencias: req.params.iddolencias, estado: 'PE' } }
        );

        if (updated === 0) {
            return res.status(404).json({ error: 'Dolencia no encontrada o ya procesada' });
        }

        invalidateByPrefix('dolencias');
        res.json({ message: 'Dolencia rechazada', iddolencias: req.params.iddolencias });
    } catch (error) {
        console.error('Error rechazando dolencia:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = ruta;
