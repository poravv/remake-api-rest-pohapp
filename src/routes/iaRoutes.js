/**
 * Rutas para funcionalidades de IA
 */
const express = require('express');
const router = express.Router();
const iaController = require('../controllers/iaController');

// Middleware simple para rate limiting (reutilizando parte del antiguo código)
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
    const now = Date.now();

    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + this.windowMs;
      next();
      return;
    }

    if (client.count >= this.maxRequests) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Por favor, intente nuevamente más tarde.'
      });
    }

    client.count++;
    next();
  }
};

// Rutas POST
router.post('/validar', rateLimit.middleware.bind(rateLimit), iaController.validarTermino);
router.post('/interpretar', rateLimit.middleware.bind(rateLimit), iaController.interpretarTermino);

// Rutas GET
router.get('/relacionados', rateLimit.middleware.bind(rateLimit), iaController.buscarRelacionados);
router.get('/estado', iaController.estadoModelos);

module.exports = router;
