const {Sequelize} = require('sequelize')
require('dotenv').config();

const sequelize = new  Sequelize(process.env.DB_NAME,process.env.DB_USER,process.env.DB_PASSWORD,{
    dialect:"mysql",
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // El readiness probe de k8s ejecuta authenticate() (SELECT 1+1) cada 10s:
    // loguear cada query inunda los logs y tapa los eventos que importan
    // (claude_usage, guardrail_decision). Activable con DB_LOGGING=true.
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
})

module.exports = sequelize