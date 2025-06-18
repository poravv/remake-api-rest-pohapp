/**
 * Controlador para funcionalidades de IA
 */
const validators = require('../utils/validators');
const iaHelpers = require('../utils/iaHelpers');

/**
 * Valida un término medicinal usando el modelo de IA
 */
const validarTermino = async (req, res, next) => {
  try {
    const { termino, texto } = req.body;

    // Aceptar tanto 'termino' como 'texto' para compatibilidad
    const textoAValidar = termino || texto;

    if (!textoAValidar) {
      return res.status(400).json({ 
        error: 'Se requiere un término o texto para validar' 
      });
    }

    // Verificar que los modelos estén cargados
    await iaHelpers.verificarModelos();
    
    const resultado = await validators.validarTerminoMedicinal(textoAValidar);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Interpreta un término medicinal usando el modelo de IA
 */
const interpretarTermino = async (req, res, next) => {
  try {
    const { termino, consulta } = req.body;

    // Aceptar tanto 'termino' como 'consulta' para compatibilidad
    const textoAInterpretar = termino || consulta;

    if (!textoAInterpretar) {
      return res.status(400).json({ 
        error: 'Se requiere un término o consulta para interpretar' 
      });
    }

    // Verificar que los modelos estén cargados
    await iaHelpers.verificarModelos();
    
    const resultado = await validators.interpretarTerminoMedicinal(textoAInterpretar);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Busca términos medicinales relacionados
 */
const buscarRelacionados = async (req, res, next) => {
  try {
    const { termino } = req.query;

    if (!termino) {
      return res.status(400).json({ 
        error: 'Se requiere un término para buscar relacionados' 
      });
    }

    // Verificar que los modelos estén cargados
    await iaHelpers.verificarModelos();
    
    const resultado = await validators.buscarTerminosRelacionados(termino);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Verifica el estado de los modelos de IA
 */
const estadoModelos = async (req, res, next) => {
  try {
    // Usamos el helper para obtener un diagnóstico completo
    const diagnostico = await iaHelpers.diagnosticoCompleto();
    res.json(diagnostico);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validarTermino,
  interpretarTermino,
  buscarRelacionados,
  estadoModelos
};
