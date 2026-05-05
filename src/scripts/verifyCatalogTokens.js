// Script de verificación — ejecutar una vez antes del primer deploy en staging
// Mide el token count real del catálogo Claude
// Uso: ANTHROPIC_API_KEY=xxx node src/scripts/verifyCatalogTokens.js

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const catalogService = require('../services/catalogService');

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log('Construyendo catálogo desde DB...');
  const catalogo = await catalogService.buildCatalog();

  console.log(`Catálogo generado: ${catalogo.length} caracteres`);

  const response = await client.messages.countTokens({
    model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
    system: catalogo,
    messages: [{ role: 'user', content: '¿Cuántos tokens tiene el catálogo?' }],
  });

  const tokens = response.input_tokens;
  const limit = 200000;
  const warningThreshold = 150000;

  console.log(`\n=== RESULTADO ===`);
  console.log(`Tokens del catálogo: ${tokens.toLocaleString()}`);
  console.log(`Límite Claude Haiku 4.5: ${limit.toLocaleString()}`);
  console.log(`Margen disponible: ${(limit - tokens).toLocaleString()}`);

  if (tokens < warningThreshold) {
    console.log(`OK — cabe con margen amplio`);
  } else if (tokens < limit) {
    console.log(`WARNING — cerca del límite, monitorear al agregar más pohas`);
  } else {
    console.log(`BLOCKER — supera el límite, trimear texto_entrenamiento`);
    process.exit(1);
  }
}

main().catch(console.error);
