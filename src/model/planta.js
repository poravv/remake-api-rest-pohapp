const { DataTypes } = require('sequelize')
const database = require('../database')

const planta = database.define('planta',{
    idplanta:{
        primaryKey:true,
        autoIncrement:true,
        type:DataTypes.INTEGER
    },
    nombre:{
        type:DataTypes.STRING,
        allowNull:false
    },
    descripcion:{
        type:DataTypes.STRING,
        allowNull:false
    },
    estado:{
        type:DataTypes.STRING,
        allowNull:false
    },
    img:{
        type:DataTypes.BLOB,
    }
},{
    tableName:"Planta",
    timestamps:false
})

module.exports=planta