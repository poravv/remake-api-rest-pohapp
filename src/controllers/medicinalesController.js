/**
 * Controlador para búsquedas de plantas medicinales
 */
const { Op } = require('sequelize');
const { Planta, Poha, PohaPlanta, Dolencias, DolenciasPoha, Autor } = require('../models');

/**
 * Busca plantas medicinales por nombre
 */
const buscarPorNombre = async (req, res, next) => {
  try {
    const { nombre } = req.query;
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ mensaje: 'El parámetro nombre es requerido' });
    }
    
    const plantas = await Planta.findAll({
      where: {
        nombre: {
          [Op.like]: `%${nombre}%`
        }
      },
      limit: 20
    });
    
    res.json(plantas);
  } catch (error) {
    next(error);
  }
};

/**
 * Busca poha por nombre
 */
const buscarPoha = async (req, res, next) => {
  try {
    const { nombre } = req.query;
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ mensaje: 'El parámetro nombre es requerido' });
    }
    
    const poha = await Poha.findAll({
      where: {
        nombre: {
          [Op.like]: `%${nombre}%`
        }
      },
      limit: 20
    });
    
    res.json(poha);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene detalles completos de un poha incluyendo plantas relacionadas y dolencias
 */
const obtenerDetallePoha = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const poha = await Poha.findByPk(id, {
      include: [
        {
          model: Planta,
          as: 'plantas',
          through: { attributes: [] }
        },
        {
          model: Dolencias,
          as: 'dolencias',
          through: { attributes: [] }
        },
        {
          model: Autor,
          as: 'autor'
        }
      ]
    });
    
    if (!poha) {
      return res.status(404).json({ mensaje: 'Poha no encontrado' });
    }
    
    res.json(poha);
  } catch (error) {
    next(error);
  }
};

/**
 * Busca poha por dolencia
 */
const buscarPorDolencia = async (req, res, next) => {
  try {
    const { idDolencia } = req.params;
    
    const pohaList = await Poha.findAll({
      include: [
        {
          model: Dolencias,
          as: 'dolencias',
          through: { attributes: [] },
          where: { iddolencias: idDolencia }
        }
      ]
    });
    
    res.json(pohaList);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene estadísticas generales
 */
const obtenerEstadisticas = async (req, res, next) => {
  try {
    const totalPoha = await Poha.count();
    const totalPlantas = await Planta.count();
    const totalDolencias = await Dolencias.count();
    const totalAutores = await Autor.count();
    
    res.json({
      totalPoha,
      totalPlantas,
      totalDolencias,
      totalAutores
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  buscarPorNombre,
  buscarPoha,
  obtenerDetallePoha,
  buscarPorDolencia,
  obtenerEstadisticas
};
