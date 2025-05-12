/**
 * Modelo para la entidad Poha_Planta (relación entre Poha y Planta)
 */
const { DataTypes, Op } = require('sequelize');
const database = require('../config/database');

const poha_planta = database.define('poha_planta', {
    idplanta: {
        primaryKey: true,
        type: DataTypes.INTEGER,
    },
    idpoha: {
        primaryKey: true,
        type: DataTypes.INTEGER,
    },
    idusuario: {
        primaryKey: true,
        type: DataTypes.STRING,
    }
},{
    tableName: "poha_planta",
    timestamps: false
});

/**
 * Métodos estáticos para operaciones comunes
 */
poha_planta.obtenerTodos = async () => {
  return await poha_planta.findAll();
};

poha_planta.obtenerPorPoha = async (idPoha) => {
  return await poha_planta.findAll({
    where: {
      idpoha: idPoha
    }
  });
};

poha_planta.obtenerPorPlanta = async (idPlanta) => {
  return await poha_planta.findAll({
    where: {
      idplanta: idPlanta
    }
  });
};

module.exports = poha_planta;