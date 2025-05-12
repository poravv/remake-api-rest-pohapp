/**
 * Modelo para la entidad Usuario
 */
const { DataTypes, Op } = require('sequelize');
const database = require('../config/database');

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

/**
 * Métodos estáticos para operaciones comunes
 */
usuario.obtenerTodos = async () => {
  return await usuario.findAll();
};

usuario.obtenerPorId = async (id) => {
  return await usuario.findByPk(id);
};

usuario.buscarPorNombre = async (nombre) => {
  return await usuario.findAll({
    where: {
      nombre: {
        [Op.like]: `%${nombre}%`
      }
    }
  });
};

usuario.buscarPorCorreo = async (correo) => {
  return await usuario.findAll({
    where: {
      correo: correo
    }
  });
};

usuario.obtenerAdministradores = async () => {
  return await usuario.findAll({
    where: {
      isAdmin: 1
    }
  });
};

module.exports = usuario;