/**
 * Modelo para la entidad Autor
 */
const { DataTypes, Op } = require('sequelize');
const database = require('../config/database');

const autor = database.define('autor',{
    idautor:{
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER
    },
    nombre:{
        type: DataTypes.STRING,
        allowNull: false
    },
    apellido:{
        type: DataTypes.STRING,
        allowNull: false
    },
    nacimiento:{
        type: DataTypes.DATE,
        allowNull: false
    },
    ciudad:{
        type: DataTypes.STRING,
        allowNull: false
    },
    pais:{
        type: DataTypes.STRING,
        allowNull: false
    }
},{
    tableName: "autor",
    timestamps: false
})

/**
 * Métodos estáticos para operaciones comunes
 */
autor.obtenerTodos = async () => {
  return await autor.findAll();
};

autor.obtenerPorId = async (id) => {
  return await autor.findByPk(id);
};

autor.buscarPorNombre = async (nombre) => {
  return await autor.findAll({
    where: {
      [Op.or]: [
        { nombre: { [Op.like]: `%${nombre}%` } },
        { apellido: { [Op.like]: `%${nombre}%` } }
      ]
    }
  });
};

module.exports = autor;