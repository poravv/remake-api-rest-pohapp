const {Sequelize} = require('sequelize')
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_DATABASE || 'db-pohapp',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'pohapp',
    {
        dialect: "mysql",
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        logging: process.env.NODE_ENV !== 'production',
        define: {
            timestamps: false
        }
    }
)

module.exports = sequelize
