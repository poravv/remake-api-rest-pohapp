/**
 * Modelo para la entidad Dolencias
 */
const { DataTypes, Op } = require('sequelize');
const database = require('../config/database');

const dolencias = database.define('dolencias',{
    iddolencias:{
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER
    },
    descripcion:{
        type: DataTypes.STRING,
        allowNull: false
    },
    estado:{
        type: DataTypes.STRING,
        allowNull: false
    }
},{
    tableName: "dolencias",
    timestamps: false
});

/**
 * Métodos estáticos para operaciones comunes
 */
dolencias.obtenerTodos = async () => {
  return await dolencias.findAll();
};

dolencias.obtenerPorId = async (id) => {
  return await dolencias.findByPk(id);
};

dolencias.buscarPorDescripcion = async (texto) => {
  return await dolencias.findAll({
    where: {
      descripcion: {
        [Op.like]: `%${texto}%`
      }
    }
  });
};

module.exports = dolencias;