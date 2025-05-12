/**
 * Controlador para la entidad Planta
 */
const { Planta } = require('../models');

/**
 * Obtiene todas las plantas
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const plantas = await Planta.obtenerTodos();
    res.json(plantas);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene una planta por su ID
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const planta = await Planta.obtenerPorId(req.params.id);
    if (!planta) {
      res.status(404);
      throw new Error('Planta no encontrada');
    }
    res.json(planta);
  } catch (error) {
    next(error);
  }
};

/**
 * Busca plantas por nombre
 */
const buscarPorNombre = async (req, res, next) => {
  try {
    const nombre = req.query.nombre || '';
    const plantas = await Planta.buscarPorNombre(nombre);
    res.json(plantas);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea una nueva planta
 */
const crear = async (req, res, next) => {
  try {
    const nuevaPlanta = await Planta.create(req.body);
    res.status(201).json(nuevaPlanta);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza una planta existente
 */
const actualizar = async (req, res, next) => {
  try {
    const [actualizado] = await Planta.update(req.body, {
      where: { idplanta: req.params.id }
    });
    
    if (actualizado) {
      const plantaActualizada = await Planta.obtenerPorId(req.params.id);
      res.json(plantaActualizada);
    } else {
      res.status(404);
      throw new Error('Planta no encontrada');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina una planta
 */
const eliminar = async (req, res, next) => {
  try {
    const eliminado = await Planta.destroy({
      where: { idplanta: req.params.id }
    });
    
    if (eliminado) {
      res.json({ mensaje: 'Planta eliminada correctamente' });
    } else {
      res.status(404);
      throw new Error('Planta no encontrada');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  buscarPorNombre,
  crear,
  actualizar,
  eliminar
};