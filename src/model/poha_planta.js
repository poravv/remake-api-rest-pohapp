const { DataTypes } = require('sequelize')
const database = require('../database')
const planta = require('./planta')

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
    tableName:"poha_planta",
    timestamps:false
});

poha_planta.hasOne(planta,{
    foreignKey:"idplanta",
    primaryKey:"idplanta",
    sourceKey:"idplanta",
})

module.exports = poha_planta