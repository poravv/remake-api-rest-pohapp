/**
 * Índice de modelos - Centraliza todos los modelos de la aplicación
 * y establece las relaciones entre ellos
 */
const database = require('../config/database');

// Importar modelos
const Autor = require('./autor');
const Dolencias = require('./dolencias');
const DolenciasPoha = require('./dolencias_poha');
const Planta = require('./planta');
const Poha = require('./poha');
const PohaPlanta = require('./poha_planta');
const Puntos = require('./puntos');
const Usuario = require('./usuario');

// Definir relaciones entre modelos

// Relaciones entre Planta y otras entidades
PohaPlanta.belongsTo(Planta, { foreignKey: 'idplanta' });
Planta.hasMany(PohaPlanta, { foreignKey: 'idplanta' });

// Relaciones entre Poha y otras entidades
Poha.hasMany(DolenciasPoha, { foreignKey: 'idpoha' });
DolenciasPoha.belongsTo(Poha, { foreignKey: 'idpoha' });
Poha.hasMany(PohaPlanta, { foreignKey: 'idpoha' });
PohaPlanta.belongsTo(Poha, { foreignKey: 'idpoha' });

// Relaciones entre Dolencias y otras entidades
Dolencias.hasMany(DolenciasPoha, { foreignKey: 'iddolencias' });
DolenciasPoha.belongsTo(Dolencias, { foreignKey: 'iddolencias' });

// Relaciones con Autor
Poha.belongsTo(Autor, { foreignKey: 'idautor' });
Autor.hasMany(Poha, { foreignKey: 'idautor' });

// Relaciones con Puntos - Comentado hasta verificar la estructura correcta
// Poha.belongsTo(Puntos, { foreignKey: 'punto_id' });
// Puntos.hasMany(Poha, { foreignKey: 'punto_id' });

// Exportar todos los modelos
module.exports = {
  Autor,
  Dolencias,
  DolenciasPoha,
  Planta,
  Poha,
  PohaPlanta,
  Puntos,
  Usuario,
  database
};
