const { DataTypes } = require('sequelize')
const database = require('../database');
const dolencias = require('./dolencias');

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
    tableName:"dolencias_poha",
    timestamps:false
});

dolencias_poha.hasOne(dolencias,{
    foreignKey:"iddolencias",
    primaryKey:"iddolencias",
    sourceKey:"iddolencias",
})


module.exports = dolencias_poha