/**
 * Módulo para realizar una búsqueda efectiva en la base de datos POHAPP
 * utilizando la interpretación del modelo de IA.
 * 
 * Este archivo implementa estrategias avanzadas de búsqueda para conectar
 * las categorías interpretadas por el modelo con los datos reales en la base de datos.
 */

const dolenciaModel = require('../model/dolencias');
const pohaModel = require('../model/poha');
const { Op } = require('sequelize');

/**
 * Busca pohas relacionados con una categoría interpretada por el modelo de IA
 * @param {Object} database - Instancia de sequelize
 * @param {String} category - Categoría interpretada por el modelo de IA
 * @param {Array} keywords - Palabras clave extraídas de la consulta
 * @returns {Promise<Array>} - Pohas relacionados
 */
async function searchRemediosByCategory(database, category, keywords = []) {
  try {
    console.log(`[Búsqueda avanzada] Categoría: ${category}, Keywords: ${keywords.join(', ')}`);
    
    // Paso 1: Buscar dolencias relacionadas con la categoría
    const dolencias = await dolenciaModel.findAll({
      where: {
        [Op.or]: [
          { descripcion: { [Op.like]: `%${category}%` } },
          ...keywords.map(keyword => ({ descripcion: { [Op.like]: `%${keyword}%` } }))
        ],
        estado: 'AC'
      },
      attributes: ['iddolencias', 'descripcion'],
      limit: 5
    });
    
    if (dolencias.length > 0) {
      console.log(`[Búsqueda] Encontradas ${dolencias.length} dolencias relacionadas`);
      
      // Paso 2: Buscar pohas relacionados con esas dolencias
      const pohas = await pohaModel.findAll({
        include: [
          {
            association: 'dolencias_poha',
            where: {
              iddolencias: {
                [Op.in]: dolencias.map(d => d.iddolencias)
              }
            }
          }
        ],
        where: {
          estado: 'AC'
        },
        limit: 20
      });
      
      return pohas;
    }
    
    // Paso 3: Si no hay dolencias, buscar por palabras clave en preparados
    return await pohaModel.findAll({
      where: {
        [Op.or]: [
          { preparado: { [Op.like]: `%${category}%` } },
          { recomendacion: { [Op.like]: `%${category}%` } },
          ...keywords.map(keyword => ({ 
            [Op.or]: [
              { preparado: { [Op.like]: `%${keyword}%` } },
              { recomendacion: { [Op.like]: `%${keyword}%` } }
            ]
          }))
        ],
        estado: 'AC'
      },
      limit: 15
    });
    
  } catch (error) {
    console.error('[Búsqueda] Error:', error);
    return [];
  }
}

module.exports = {
  searchRemediosByCategory
};
