const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { createAtomicPohaAporte } = require('../services/aporteService');

const router = express.Router();

/**
 * POST /api/pohapp/aporte/poha/atomic
 * Creates a poha (remedio) alongside any new plantas / dolencias in one
 * transaction. If the final insert fails, no orphan plantas/dolencias
 * remain. The client sends a nested payload where each plant/dolencia
 * entry is either an existing `{id}` or a brand new object with its
 * own fields. Everything lands with estado='PE' unless the caller is
 * admin (in which case estado='AC').
 *
 * Request body:
 *   {
 *     poha: { preparado, recomendacion, mate?, terere?, te?, idautor? },
 *     plantas: [ number | {id} | {nombre, descripcion?, img?, nombre_cientifico?, familia?, ...} ],
 *     dolencias?: [ number | {id} | {descripcion} ]
 *   }
 *
 * Response 201:
 *   { idpoha, estado, plantas: number[], dolencias: number[] }
 */
router.post('/poha/atomic', verifyToken, async (req, res) => {
  try {
    const result = await createAtomicPohaAporte(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) {
      console.error('Error en aporte atómico:', error);
    }
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
