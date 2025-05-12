/**
 * Controlador para la entidad Poha_Planta
 */
const { PohaPlanta, Poha, Planta } = require('../models');

/**
 * Obtiene todos los registros
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const registros = await PohaPlanta.obtenerTodos();
    res.json(registros);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene las plantas asociadas a un poha específico
 */
const obtenerPorPoha = async (req, res, next) => {
  try {
    const idpoha = req.params.idpoha;
    const registros = await PohaPlanta.obtenerPorPoha(idpoha);
    
    if (!registros || registros.length === 0) {
      res.status(404).json({ mensaje: 'No se encontraron plantas para este poha' });
      return;
    }
    
    res.json(registros);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene los poha asociados a una planta específica
 */
const obtenerPorPlanta = async (req, res, next) => {
  try {
    const idplanta = req.params.idplanta;
    const registros = await PohaPlanta.obtenerPorPlanta(idplanta);
    
    if (!registros || registros.length === 0) {
      res.status(404).json({ mensaje: 'No se encontraron poha para esta planta' });
      return;
    }
    
    res.json(registros);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo registro de asociación
 */
const crear = async (req, res, next) => {
  try {
    const { idplanta, idpoha, idusuario } = req.body;
    
    if (!idplanta || !idpoha || !idusuario) {
      res.status(400).json({ mensaje: 'Faltan datos obligatorios: idplanta, idpoha, idusuario' });
      return;
    }
    
    const nuevoRegistro = await PohaPlanta.create({
      idplanta,
      idpoha,
      idusuario
    });
    
    res.status(201).json(nuevoRegistro);
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina una asociación
 */
const eliminar = async (req, res, next) => {
  try {
    const { idplanta, idpoha, idusuario } = req.params;
    
    const eliminado = await PohaPlanta.destroy({
      where: { 
        idplanta,
        idpoha,
        idusuario
      }
    });
    
    if (eliminado) {
      res.json({ mensaje: 'Asociación eliminada correctamente' });
    } else {
      res.status(404);
      throw new Error('Asociación no encontrada');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorPoha,
  obtenerPorPlanta,
  crear,
  eliminar
};