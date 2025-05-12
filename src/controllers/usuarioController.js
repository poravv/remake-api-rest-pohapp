/**
 * Controlador para la entidad Usuario
 */
const { Usuario } = require('../models');

/**
 * Obtiene todos los registros
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const registros = await Usuario.obtenerTodos();
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
    const idusuario = req.params.idusuario;
    const usuario = await Usuario.obtenerPorId(idusuario);
    
    if (!usuario) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }
    
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

/**
 * Verifica si un usuario es administrador
 */
const verificarAdmin = async (req, res, next) => {
  try {
    const idusuario = req.params.idusuario;
    const usuario = await Usuario.obtenerPorId(idusuario);
    
    if (!usuario) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }
    
    res.json({ 
      isAdmin: usuario.isAdmin === 1,
      usuario: usuario.nombre
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo registro
 */
const crear = async (req, res, next) => {
  try {
    const nuevoUsuario = await Usuario.create(req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un registro existente
 */
const actualizar = async (req, res, next) => {
  try {
    const idusuario = req.params.idusuario;
    
    const [actualizado] = await Usuario.update(req.body, {
      where: { idusuario }
    });
    
    if (actualizado) {
      const usuarioActualizado = await Usuario.obtenerPorId(idusuario);
      res.json(usuarioActualizado);
    } else {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  verificarAdmin,
  crear,
  actualizar
};