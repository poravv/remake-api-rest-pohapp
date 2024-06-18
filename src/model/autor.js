const { DataTypes } = require('sequelize')
const database = require('../database')

const autor = database.define('autor',{
    idautor:{
        primaryKey:true,
        autoIncrement:true,
        type:DataTypes.INTEGER
    },
    nombre:{
        type:DataTypes.STRING,
        allowNull:false
    },
    apellido:{
        type:DataTypes.STRING,
        allowNull:false
    },
    nacimiento:{
        type:DataTypes.DATE,
        allowNull:false
    },
    apellido:{
        type:DataTypes.STRING,
        allowNull:false
    },
    ciudad:{
        type:DataTypes.STRING,
        allowNull:false
    },
    pais:{
        type:DataTypes.STRING,
        allowNull:false
    }
},{
    tableName:"Autor",
    timestamps:false
})

module.exports=autor