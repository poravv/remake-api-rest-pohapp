/**
 * Controlador para la entidad Dolencias_Poha
 */
const { DolenciasPoha, Dolencias, Poha } = require('../models');

/**
 * Obtiene todos los registros
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const registros = await DolenciasPoha.obtenerTodos();
    res.json(registros);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene las dolencias asociadas a un poha específico
 */
const obtenerPorPoha = async (req, res, next) => {
  try {
    const idpoha = req.params.idpoha;
    const registros = await DolenciasPoha.obtenerPorPoha(idpoha);
    
    if (!registros || registros.length === 0) {
      res.status(404).json({ mensaje: 'No se encontraron dolencias para este poha' });
      return;
    }
    
    res.json(registros);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene los poha asociados a una dolencia específica
 */
const obtenerPorDolencia = async (req, res, next) => {
  try {
    const iddolencias = req.params.iddolencias;
    const registros = await DolenciasPoha.obtenerPorDolencia(iddolencias);
    
    if (!registros || registros.length === 0) {
      res.status(404).json({ mensaje: 'No se encontraron poha para esta dolencia' });
      return;
    }
    
    res.json(registros);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea una nueva asociación
 */
const crear = async (req, res, next) => {
  try {
    const { iddolencias, idpoha, idusuario } = req.body;
    
    if (!iddolencias || !idpoha || !idusuario) {
      res.status(400).json({ mensaje: 'Faltan datos obligatorios: iddolencias, idpoha, idusuario' });
      return;
    }
    
    const nuevoRegistro = await DolenciasPoha.create({
      iddolencias,
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
    const { iddolencias, idpoha, idusuario } = req.params;
    
    const eliminado = await DolenciasPoha.destroy({
      where: { 
        iddolencias,
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
  obtenerPorDolencia,
  crear,
  eliminar
};