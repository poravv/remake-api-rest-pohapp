const { DataTypes } = require('sequelize')
const database = require('../database')

const dolencias = database.define('dolencias',{
    iddolencias:{
        primaryKey:true,
        autoIncrement:true,
        type:DataTypes.INTEGER
    },
    descripcion:{
        type:DataTypes.STRING,
        allowNull:false
    },
    estado:{
        type:DataTypes.STRING,
        allowNull:false
    }
},{
    tableName:"Dolencias",
    timestamps:false
});

module.exports=dolencias