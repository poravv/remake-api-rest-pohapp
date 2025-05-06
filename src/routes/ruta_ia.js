const express = require('express');
const ruta = express.Router();
const database = require('../database');
const validators = require('../utils/validators');

// Middleware simple de rate limiting
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 100, // límite de 100 solicitudes por ventana por IP
  clients: new Map(),
  
  middleware: function(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!this.clients.has(ip)) {
      this.clients.set(ip, {
        count: 1,
        resetTime: Date.now() + this.windowMs
      });
      next();
      return;
    }
    
    const client = this.clients.get(ip);
    
    // Restablecer contador si expiró el período
    if (Date.now() > client.resetTime) {
      client.count = 1;
      client.resetTime = Date.now() + this.windowMs;
      next();
      return;
    }
    
    // Incrementar contador y verificar límite
    client.count++;
    
    if (client.count > this.maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Demasiadas solicitudes. Por favor, intente de nuevo más tarde.'
      });
    }
    
    next();
  }
};

// Inicializar modelos al arrancar
(async () => {
  try {
    console.log('Inicializando modelos de IA para búsqueda y validación...');
    const initialized = await validators.initModels();
    if (!initialized) {
      console.error('No se pudieron inicializar los modelos ONNX');
    } else {
      console.log('Modelos de IA inicializados correctamente');
    }
  } catch (error) {
    console.error('Error al inicializar modelos:', error);
  }
})();

// Aplicar middleware de rate limiting a todas las rutas de IA
ruta.use(rateLimit.middleware.bind(rateLimit));

// Ruta para validar texto
ruta.post('/validar', async (req, res) => {
  const { texto } = req.body;
  
  if (!texto) {
    return res.status(400).json({ success: false, error: 'Se requiere texto para validar' });
  }
  
  // Limitar tamaño de entrada
  if (texto.length > 2000) {
    return res.status(400).json({ 
      success: false, 
      error: 'El texto excede el límite de 2000 caracteres' 
    });
  }
  
  try {
    const result = await validators.validateText(texto);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para buscar por consulta en lenguaje natural
ruta.get('/buscar', async (req, res) => {
  const { consulta } = req.query;
  
  if (!consulta) {
    return res.status(400).json({ success: false, error: 'Se requiere una consulta para buscar' });
  }
  
  try {
    const result = await validators.searchPohaByQuery(consulta, database);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para interpretar consulta sin realizar búsqueda
ruta.get('/interpretar', async (req, res) => {
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

// Importar utilidades de seguridad
const security = require('../utils/security');

// Ruta para recargar los modelos (solo para administradores)
ruta.post('/admin/recargar-modelos', async (req, res) => {
  // Verificar autenticación mediante firma
  if (!security.verifySignature(req, process.env.POHAPP_API_SECRET)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  
  try {
    console.log('Recargando modelos de IA...');
    const initialized = await validators.initModels();
    
    if (initialized) {
      console.log('Modelos recargados correctamente');
    } else {
      console.error('Error al recargar modelos');
    }
    
    res.json({ success: initialized });
  } catch (error) {
    console.error('Error al recargar modelos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para verificar el estado de la API de IA
ruta.get('/estado', (req, res) => {
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

module.exports = ruta;
