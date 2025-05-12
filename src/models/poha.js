/**
 * Modelo para la entidad Poha (Remedio de hierbas medicinales)
 */
const { DataTypes, Op } = require('sequelize');
const database = require('../config/database');

const poha = database.define('poha',{
    idpoha:{
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER
    },
    preparado:{
        type: DataTypes.STRING,
        allowNull: false
    },
    estado:{
        type: DataTypes.STRING,
    },
    mate:{
        type: DataTypes.INTEGER,
    },
    terere:{
        type: DataTypes.INTEGER,
    },
    te:{
        type: DataTypes.INTEGER,
    },
    recomendacion:{
        type: DataTypes.STRING,
        allowNull: false
    },
    idautor:{
        type: DataTypes.INTEGER,
    },
    idusuario:{
        type: DataTypes.STRING,
    }
},{
    tableName: "poha",
    timestamps: false
})

/**
 * Métodos estáticos para operaciones comunes
 */
poha.obtenerTodos = async () => {
  return await poha.findAll();
};

poha.obtenerPorId = async (id) => {
  return await poha.findByPk(id);
};

poha.buscarPorPreparado = async (texto) => {
  return await poha.findAll({
    where: {
      preparado: {
        [Op.like]: `%${texto}%`
      }
    }
  });
};

poha.buscarPorAutor = async (idAutor) => {
  return await poha.findAll({
    where: {
      idautor: idAutor
    }
  });
};

poha.buscarPorUsuario = async (idUsuario) => {
  return await poha.findAll({
    where: {
      idusuario: idUsuario
    }
  });
};

module.exports = poha;