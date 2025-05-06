/**
 * Script simplificado para probar solo la API de IA sin necesidad de la base de datos
 */

const express = require('express');
const cors = require('cors');
const validators = require('./src/utils/validators');
require('dotenv').config();

// Configurar Express
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Función para iniciar los modelos de IA
async function initializeAI() {
  console.log('Inicializando modelos de IA para búsqueda y validación...');
  const initialized = await validators.initModels();
  console.log('Modelos de IA inicializados correctamente:', initialized ? '✅' : '❌');
  return initialized;
}

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'API de IA para POHAPP está funcionando'
  });
});

// Ruta para validar texto
app.post('/api/pohapp/ia/validar', async (req, res) => {
  const { texto } = req.body;
  
  if (!texto || texto.length > 1000) {
    return res.status(400).json({ success: false, error: 'Texto inválido o demasiado largo' });
  }
  
  try {
    const result = await validators.validateText(texto);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para interpretar consulta
app.get('/api/pohapp/ia/interpretar', async (req, res) => {
  const { consulta } = req.query;
  
  if (!consulta) {
    return res.status(400).json({ success: false, error: 'Se requiere una consulta para interpretar' });
  }
  
  try {
    const result = await validators.interpretQuery(consulta);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para verificar el estado de la API de IA
app.get('/api/pohapp/ia/estado', (req, res) => {
  try {
    // Verificamos el estado de los modelos de IA
    const modelosDisponibles = {
      validationModel: !!validators.validationSession,
      validationVectorizer: !!validators.validationVectorizer,
      interpreterModel: !!validators.interpreterSession,
      interpreterVectorizer: !!validators.interpreterVectorizer,
      interpreterCategories: !!validators.interpreterCategories
    };
    
    // Calculamos el porcentaje de componentes disponibles
    const totalComponentes = Object.keys(modelosDisponibles).length;
    const componentesDisponibles = Object.values(modelosDisponibles).filter(Boolean).length;
    const porcentajeDisponible = (componentesDisponibles / totalComponentes) * 100;
    
    res.json({
      success: true,
      status: 'online',
      version: validators.VERSION || 'v20250504',
      modelosDisponibles,
      salud: {
        porcentajeDisponible,
        estado: porcentajeDisponible > 80 ? 'ÓPTIMO' : (porcentajeDisponible > 40 ? 'PARCIAL' : 'CRÍTICO')
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      status: 'error',
      error: error.message 
    });
  }
});

// Ruta para simular búsqueda
app.get('/api/pohapp/ia/buscar', async (req, res) => {
  const { consulta } = req.query;
  
  if (!consulta) {
    return res.status(400).json({ success: false, error: 'Se requiere una consulta para la búsqueda' });
  }
  
  try {
    const interpretation = await validators.interpretQuery(consulta);
    
    if (!interpretation.categoryName) {
      return res.json({ 
        success: false, 
        error: 'No se pudo interpretar la consulta' 
      });
    }
    
    // Simulamos resultados de búsqueda
    const mockResults = [
      {
        idpoha: 1,
        preparado: 'Té de manzanilla para dolor de cabeza',
        recomendacion: 'Tomar 3 veces al día',
        mate: 1,
        terere: 0,
        te: 1,
        dolencias: 'dolor de cabeza',
        plantas_nombres: 'manzanilla',
        plantas_cientificos: 'Matricaria chamomilla'
      },
      {
        idpoha: 2,
        preparado: 'Té de cedrón para digestión',
        recomendacion: 'Tomar después de las comidas',
        mate: 1,
        terere: 1,
        te: 1,
        dolencias: 'digestión',
        plantas_nombres: 'cedrón',
        plantas_cientificos: 'Aloysia citrodora'
      }
    ];
    
    res.json({
      success: true,
      interpretedCategory: interpretation.categoryName,
      confidence: interpretation.confidence,
      results: mockResults,
      totalResults: mockResults.length,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar la aplicación
async function startApp() {
  try {
    await initializeAI();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor de prueba de IA corriendo en puerto ${PORT}`);
      console.log('Endpoints disponibles:');
      console.log(' - GET /api/pohapp/ia/estado');
      console.log(' - GET /api/pohapp/ia/interpretar?consulta=texto');
      console.log(' - POST /api/pohapp/ia/validar (body: { texto: "texto" })');
      console.log(' - GET /api/pohapp/ia/buscar?consulta=texto');
    });
  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
  }
}

// Iniciar la aplicación
startApp();
