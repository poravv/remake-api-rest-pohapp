/**
 * Controlador para la entidad Poha
 */
const { Poha, Autor, Usuario } = require('../models');

/**
 * Obtiene todos los registros
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const registros = await Poha.obtenerTodos();
    res.json(registros);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un registro por su ID
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const registro = await Poha.obtenerPorId(req.params.id);
    if (!registro) {
      res.status(404);
      throw new Error('Registro no encontrado');
    }
    res.json(registro);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo registro
 */
const crear = async (req, res, next) => {
  try {
    const nuevoRegistro = await Poha.create(req.body);
    res.status(201).json(nuevoRegistro);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un registro existente
 */
const actualizar = async (req, res, next) => {
  try {
    const [actualizado] = await Poha.update(req.body, {
      where: { idpoha: req.params.id }
    });
    
    if (actualizado) {
      const registroActualizado = await Poha.obtenerPorId(req.params.id);
      res.json(registroActualizado);
    } else {
      res.status(404);
      throw new Error('Registro no encontrado');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un registro
 */
const eliminar = async (req, res, next) => {
  try {
    const eliminado = await Poha.destroy({
      where: { idpoha: req.params.id }
    });
    
    if (eliminado) {
      res.json({ mensaje: 'Registro eliminado correctamente' });
    } else {
      res.status(404);
      throw new Error('Registro no encontrado');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Búsqueda por texto en el preparado o recomendación
 */
const buscar = async (req, res, next) => {
  try {
    const texto = req.query.texto || '';
    const registros = await Poha.buscarPorPreparado(texto);
    res.json(registros);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  buscar
};