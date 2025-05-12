/**
 * Modelo para la entidad Planta
 */
const { DataTypes, Op } = require('sequelize');
const database = require('../config/database');

const planta = database.define('planta', {
  idplanta: {
    primaryKey: true,
    autoIncrement: true,
    type: DataTypes.INTEGER
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false
  },
  img: {
    type: DataTypes.STRING
  },
  nombre_cientifico: {
    type: DataTypes.STRING,
    allowNull: true
  },
  familia: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subfamilia: {
    type: DataTypes.STRING,
    allowNull: true
  },
  habitad_distribucion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ciclo_vida: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fenologia: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'planta',
  timestamps: false
})

/**
 * Métodos estáticos para operaciones comunes
 */
planta.obtenerTodos = async () => {
  return await planta.findAll();
};

planta.obtenerPorId = async (id) => {
  return await planta.findByPk(id);
};

planta.buscarPorNombre = async (nombre) => {
  return await planta.findAll({
    where: {
      nombre: {
        [Op.like]: `%${nombre}%`
      }
    }
  });
};

module.exports = planta;
