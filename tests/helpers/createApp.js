/**
 * Creates a minimal Express app for integration tests.
 * Mocks database, Redis, MinIO, and OpenAI so that no real connections are needed.
 */

// --- Mock Sequelize BEFORE any model/service requires it ---
const { Sequelize } = require('sequelize');

// Create a mock sequelize instance that never connects
jest.mock('../../src/database', () => {
  const mockSequelize = {
    authenticate: jest.fn().mockResolvedValue(true),
    query: jest.fn().mockResolvedValue([[]]),
    define: jest.fn(() => ({
      findAll: jest.fn().mockResolvedValue([]),
      findByPk: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue([0]),
      destroy: jest.fn().mockResolvedValue(0),
      count: jest.fn().mockResolvedValue(0),
      hasOne: jest.fn(),
      hasMany: jest.fn(),
      belongsTo: jest.fn(),
    })),
  };
  return mockSequelize;
});

// Mock Redis/cache client
jest.mock('../../src/services/cacheClient', () => ({
  initRedis: jest.fn().mockResolvedValue(false),
  isRedisReady: jest.fn().mockReturnValue(false),
  hasRedisConfig: jest.fn().mockReturnValue(false),
  getRedisClient: jest.fn().mockReturnValue(null),
  getFromMemory: jest.fn().mockReturnValue(null),
  setInMemory: jest.fn(),
  invalidateByPrefix: jest.fn(),
}));

// Mock MinIO service
jest.mock('../../src/services/minioService', () => ({
  getPresignedUrl: jest.fn().mockResolvedValue('https://mocked-signed-url.com/image.jpg'),
  isMinioUrl: jest.fn().mockReturnValue(false),
  extractObjectName: jest.fn().mockReturnValue('image.jpg'),
}));

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: new Array(1536).fill(0.1) }],
        }),
      },
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Mocked AI response' } }],
          }),
        },
      },
    })),
  };
});

const express = require('express');
const cors = require('cors');

function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Load routes via config_rutas
  const rutas = require('../../src/config_rutas');
  app.use(rutas);

  // Error handler
  const { errorHandler } = require('../../src/middleware/errorHandler');
  app.use(errorHandler);

  return app;
}

module.exports = { createTestApp };
