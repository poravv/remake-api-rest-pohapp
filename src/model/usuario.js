const { DataTypes } = require('sequelize');
const database = require('../database');

const usuario = database.define('usuario', {
    idusuario: {
        primaryKey: true,
        type: DataTypes.STRING
    },
    correo: {
        type: DataTypes.STRING,
    },
    nombre: {
        type: DataTypes.STRING,
    },
    uid: {
        type: DataTypes.STRING,
    },
    photourl: {
        type: DataTypes.STRING,
    },
    isAdmin: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    }
}, {
    tableName: "usuario",
    timestamps: false
});

module.exports = usuario;
