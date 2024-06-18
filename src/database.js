const {Sequelize} = require('sequelize')
require('dotenv').config();

const sequelize = new  Sequelize(process.env.DB_DATABASE,process.env.DB_USER,process.env.DB_PASSWORD,{
    dialect:"mysql",
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    //insecureAuth:true
})

module.exports = sequelize