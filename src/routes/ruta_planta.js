const express = require('express')
const ruta = express.Router();
const planta = require('../model/planta')
const usuario = require('../model/usuario')
const database = require('../database')
const { QueryTypes } = require('sequelize');
const { invalidateByPrefix } = require('../middleware/cache');

ruta.use((req, _res, next) => {
    // Normaliza params numericos basicos (evita NaN en rutas con IDs).
    if (req.params && req.params.idplanta !== undefined) {
        const id = parseInt(req.params.idplanta, 10);
        if (Number.isNaN(id)) {
            return _res.status(400).json({ error: 'idplanta invalido' });
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

ruta.get('/getsql/:nombre', async (req, res) => {
    const nombre = (req.params.nombre || '').trim();
    if (!nombre) {
        return res.status(400).json({ error: 'nombre requerido' });
    }
    await database
        .query(
            'select idplanta,nombre,descripcion,estado from planta where upper(nombre) like upper(:nombre)',
            { replacements: { nombre: `%${nombre}%` }, type: QueryTypes.SELECT },
        )
        .then((response) => {
            res.json(response);
        })
        .catch((error) => {
            console.error(error);
            console.log(`Algo salió mal ${error}`);
        });

})

ruta.get('/getlimit/', async (req, res) => {
    try {
        await database.query('select * from planta limit 100', { type: QueryTypes.SELECT }).then((response) => {
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            console.log(`Algo salió mal ${error}`);
        });
    } catch (error) {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    }
})

ruta.get('/usage', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.idplanta,
                p.nombre,
                p.descripcion,
                p.estado,
                p.img,
                p.nombre_cientifico,
                p.familia,
                p.subfamilia,
                p.habitad_distribucion,
                p.ciclo_vida,
                p.fenologia,
                COUNT(DISTINCT pp.idpoha) AS poha_count
            FROM planta p
            LEFT JOIN poha_planta pp ON pp.idplanta = p.idplanta
            GROUP BY 
                p.idplanta,
                p.nombre,
                p.descripcion,
                p.estado,
                p.img,
                p.nombre_cientifico,
                p.familia,
                p.subfamilia,
                p.habitad_distribucion,
                p.ciclo_vida,
                p.fenologia
        `;

        const response = await database.query(query, { type: QueryTypes.SELECT });
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo uso de plantas' });
    }
});

ruta.get('/get/', async (req, res) => {
    const pagination = parsePagination(req, res);
    if (pagination === null && (req.query.page !== undefined || req.query.pageSize !== undefined)) {
        return;
    }
    // Solo devolver plantas activas (estado = 'AC')
    await planta.findAll({ 
        where: { estado: 'AC' },
        ...(pagination || {}) 
    }).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.get('/get/:idplanta', async (req, res) => {
    await planta.findByPk(req.params.idplanta).then((response) => {
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.post('/post/', async (req, res) => {
    try {
        const { nombre, descripcion, idusuario } = req.body || {};
        if (!isNonEmptyString(nombre) || !isNonEmptyString(descripcion)) {
            return res.status(400).json({ error: 'nombre y descripcion son requeridos' });
        }

        // Determinar estado según rol del usuario
        let estado = 'PE'; // Por defecto, pendiente de aprobación
        if (idusuario) {
            const user = await usuario.findByPk(idusuario);
            if (user && user.isAdmin === 1) {
                estado = 'AC'; // Admin: activo directamente
            }
        }

        const plantaData = { ...req.body, estado };
        await planta.create(plantaData).then((response) => {
            invalidateByPrefix('plantas');
            invalidateByPrefix('medicinales');
            res.json(response);
        }).catch((error) => {
            console.error(error); 
            console.log(`Algo salió mal ${error}`);
            res.status(500).json({ error: 'Error al crear planta' });
        });
    } catch (error) {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
})

ruta.put('/put/:idplanta', async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'body requerido' });
    }
    await planta.update(req.body, { where: { idplanta: req.params.idplanta } }).then((response) => {
        invalidateByPrefix('plantas');
        invalidateByPrefix('medicinales');
        res.json(response);
    }).catch((error) => {
        console.error(error); 
        console.log(`Algo salió mal ${error}`);
    });
})

ruta.delete('/delete/:idplanta', async (req, res) => {
    await planta.destroy({ where: { idplanta: req.params.idplanta } }).then((response) => {
        invalidateByPrefix('plantas');
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

// Listar plantas pendientes de aprobación (solo para admin)
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

        const pendientes = await planta.findAll({ 
            where: { estado: 'PE' },
            order: [['idplanta', 'DESC']]
        });
        res.json(pendientes);
    } catch (error) {
        console.error('Error obteniendo plantas pendientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Aprobar planta pendiente (cambiar estado de PE a AC)
ruta.put('/aprobar/:idplanta', async (req, res) => {
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

        const result = await planta.update(
            { estado: 'AC' }, 
            { where: { idplanta: req.params.idplanta, estado: 'PE' } }
        );
        
        if (result[0] === 0) {
            return res.status(404).json({ error: 'Planta no encontrada o ya aprobada' });
        }

        invalidateByPrefix('plantas');
        invalidateByPrefix('medicinales');
        res.json({ message: 'Planta aprobada exitosamente', affected: result[0] });
    } catch (error) {
        console.error('Error aprobando planta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rechazar planta pendiente (eliminar o marcar como inactiva)
ruta.put('/rechazar/:idplanta', async (req, res) => {
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

        const result = await planta.update(
            { estado: 'IN' }, 
            { where: { idplanta: req.params.idplanta, estado: 'PE' } }
        );
        
        if (result[0] === 0) {
            return res.status(404).json({ error: 'Planta no encontrada o ya procesada' });
        }

        invalidateByPrefix('plantas');
        invalidateByPrefix('medicinales');
        res.json({ message: 'Planta rechazada', affected: result[0] });
    } catch (error) {
        console.error('Error rechazando planta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


module.exports = ruta;
