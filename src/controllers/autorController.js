/**
 * Controlador para la entidad Autor
 */
const { Autor } = require('../models');

/**
 * Obtiene todos los autores
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const autores = await Autor.obtenerTodos();
    res.json(autores);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un autor por su ID
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const autor = await Autor.obtenerPorId(req.params.id);
    if (!autor) {
      res.status(404);
      throw new Error('Autor no encontrado');
    }
    res.json(autor);
  } catch (error) {
    next(error);
  }
};

/**
 * Busca autores por nombre o apellido
 */
const buscarPorNombre = async (req, res, next) => {
  try {
    const nombre = req.query.nombre || '';
    const autores = await Autor.buscarPorNombre(nombre);
    res.json(autores);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo autor
 */
const crear = async (req, res, next) => {
  try {
    const nuevoAutor = await Autor.create(req.body);
    res.status(201).json(nuevoAutor);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un autor existente
 */
const actualizar = async (req, res, next) => {
  try {
    const [actualizado] = await Autor.update(req.body, {
      where: { idautor: req.params.id }
    });
    
    if (actualizado) {
      const autorActualizado = await Autor.obtenerPorId(req.params.id);
      res.json(autorActualizado);
    } else {
      res.status(404);
      throw new Error('Autor no encontrado');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un autor
 */
const eliminar = async (req, res, next) => {
  try {
    const eliminado = await Autor.destroy({
      where: { idautor: req.params.id }
    });
    
    if (eliminado) {
      res.json({ mensaje: 'Autor eliminado correctamente' });
    } else {
      res.status(404);
      throw new Error('Autor no encontrado');
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