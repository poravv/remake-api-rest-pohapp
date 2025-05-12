/**
 * Modelo para la entidad Puntos (calificaciones de recetas)
 */
const { DataTypes, Op } = require('sequelize');
const database = require('../config/database');

const puntos = database.define('puntos',{
    idpoha:{
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    idusuario:{
        primaryKey: true,
        type: DataTypes.INTEGER,
    },
    puntos:{
        type: DataTypes.INTEGER,
        allowNull: false
    },
    comentario:{
        type: DataTypes.STRING,
        allowNull: false
    },
},{
    tableName: "puntos",
    timestamps: false
})

/**
 * Métodos estáticos para operaciones comunes
 */
puntos.obtenerTodos = async () => {
  return await puntos.findAll();
};

puntos.obtenerPorPoha = async (idPoha) => {
  return await puntos.findAll({
    where: {
      idpoha: idPoha
    }
  });
};

puntos.obtenerPorUsuario = async (idUsuario) => {
  return await puntos.findAll({
    where: {
      idusuario: idUsuario
    }
  });
};

puntos.promedioPoha = async (idPoha) => {
  const resultado = await puntos.findAll({
    where: {
      idpoha: idPoha
    },
    attributes: [
      [database.fn('AVG', database.col('puntos')), 'promedio']
    ]
  });
  
  return resultado[0].getDataValue('promedio') || 0;
};

module.exports = puntos;