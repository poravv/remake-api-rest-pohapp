/**
 * Controlador para la entidad Puntos
 */
const { Puntos, Poha, Usuario } = require('../models');

/**
 * Obtiene todos los registros
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const registros = await Puntos.findAll({
      include: [
        { model: Poha },
        { model: Usuario }
      ]
    });
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
    const idpoha = req.params.idpoha;
    const idusuario = req.params.idusuario;
    
    const registro = await Puntos.findOne({
      where: {
        idpoha: idpoha,
        idusuario: idusuario
      },
      include: [
        { model: Poha },
        { model: Usuario }
      ]
    });
    
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
    const nuevoRegistro = await Puntos.create(req.body);
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
    const idpoha = req.params.idpoha;
    const idusuario = req.params.idusuario;
    
    const [actualizado] = await Puntos.update(req.body, {
      where: { 
        idpoha: idpoha,
        idusuario: idusuario
      }
    });
    
    if (actualizado) {
      const registroActualizado = await Puntos.findOne({
        where: {
          idpoha: idpoha,
          idusuario: idusuario
        }
      });
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
    const idpoha = req.params.idpoha;
    const idusuario = req.params.idusuario;
    
    const eliminado = await Puntos.destroy({
      where: { 
        idpoha: idpoha,
        idusuario: idusuario
      }
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
 * Obtiene el promedio de puntos para un poha específico
 */
const obtenerPromedio = async (req, res, next) => {
  try {
    const idpoha = req.params.idpoha;
    const promedio = await Puntos.promedioPoha(idpoha);
    
    res.json({ idpoha, promedio });
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
  obtenerPromedio
};