const { DataTypes } = require('sequelize')
const database = require('../database')

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

module.exports = planta
