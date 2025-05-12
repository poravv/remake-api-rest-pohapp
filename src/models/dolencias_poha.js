/**
 * Modelo para la entidad Dolencias_Poha (relación entre Dolencias y Poha)
 */
const { DataTypes, Op } = require('sequelize');
const database = require('../config/database');

const dolencias_poha = database.define('dolencias_poha', {
    iddolencias: {
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
    tableName: "dolencias_poha",
    timestamps: false
});

/**
 * Métodos estáticos para operaciones comunes
 */
dolencias_poha.obtenerTodos = async () => {
  return await dolencias_poha.findAll();
};

dolencias_poha.obtenerPorDolencia = async (idDolencia) => {
  return await dolencias_poha.findAll({
    where: {
      iddolencias: idDolencia
    }
  });
};

dolencias_poha.obtenerPorPoha = async (idPoha) => {
  return await dolencias_poha.findAll({
    where: {
      idpoha: idPoha
    }
  });
};

module.exports = dolencias_poha;