const { DataTypes } = require('sequelize')
const database = require('../database')
const autor = require('./autor')
const usuario = require('./usuario')
const poha_planta = require('./poha_planta')
const dolencias_poha = require('./dolencias_poha')

const poha = database.define('poha',{
    idpoha:{
        primaryKey:true,
        autoIncrement:true,
        type:DataTypes.INTEGER
    },
    preparado:{
        type:DataTypes.STRING,
        allowNull:false
    },
    estado:{
        type:DataTypes.STRING,
    },
    mate:{
        type:DataTypes.INTEGER,
    },
    terere:{
        type:DataTypes.INTEGER,
    },
    te:{
        type:DataTypes.INTEGER,
    },
    recomendacion:{
        type:DataTypes.STRING,
        allowNull:false
    },
    idautor:{
        type:DataTypes.INTEGER,
    },
    idusuario:{
        type:DataTypes.STRING,
    },
},{
    tableName:"Poha",
    timestamps:false
})

poha.hasOne(autor,{
    foreignKey:"idautor",
    primaryKey:"idautor",
    sourceKey:"idautor",
})

poha.hasOne(usuario,{
    foreignKey:"idusuario",
    primaryKey:"idusuario",
    sourceKey:"idusuario",
})

poha.hasMany(poha_planta,{
    foreignKey:"idpoha",
    primaryKey:"idpoha",
    sourceKey:"idpoha",
})

poha.hasMany(dolencias_poha,{
    foreignKey:"idpoha",
    primaryKey:"idpoha",
    sourceKey:"idpoha",
})

module.exports=poha