/**
 * Controlador para la entidad Dolencias
 */
const { Dolencias } = require('../models');

/**
 * Obtiene todos los registros
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const registros = await Dolencias.obtenerTodos();
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
    const registro = await Dolencias.obtenerPorId(req.params.id);
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
    const nuevoRegistro = await Dolencias.create(req.body);
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
    const [actualizado] = await Dolencias.update(req.body, {
      where: { iddolencias: req.params.id }
    });
    
    if (actualizado) {
      const registroActualizado = await Dolencias.obtenerPorId(req.params.id);
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
    const eliminado = await Dolencias.destroy({
      where: { iddolencias: req.params.id }
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
 * Búsqueda por texto en la descripción
 */
const buscarPorDescripcion = async (req, res, next) => {
  try {
    const texto = req.query.texto || '';
    const registros = await Dolencias.buscarPorDescripcion(texto);
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
  buscarPorDescripcion
};