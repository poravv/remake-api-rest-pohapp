require('dotenv').config();
const { OpenAI } = require('openai');
const sequelize = require('../database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const [resultados] = await sequelize.query(`
    SELECT idpoha, texto_entrenamiento, dolencias
    FROM vw_medicina_entrenamiento;
  `);

  let total = 0;
  let errores = 0;

  for (const fila of resultados) {
    if (!fila.texto_entrenamiento || fila.texto_entrenamiento.trim() === '') {
      console.warn(`⚠️ Sin texto para idpoha ${fila.idpoha}`);
      errores++;
      continue;
    }

    const texto = `Dolencias que trata: ${fila.dolencias || ''}. ${fila.texto_entrenamiento}`.trim();

    try {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texto,
      });

      const vector = embedding.data[0].embedding;

      await sequelize.query(`
        REPLACE INTO medicina_embeddings (idpoha, resumen, embedding)
        VALUES (:idpoha, :resumen, :embedding)
      `, {
        replacements: {
          idpoha: fila.idpoha,
          resumen: texto,
          embedding: JSON.stringify(vector),
        },
      });

      console.log(`✅ Embedding generado para idpoha ${fila.idpoha}`);
      total++;
    } catch (err) {
      console.error(`❌ Error con idpoha ${fila.idpoha}:`, err.message);
      errores++;
    }
  }

  console.log(`\nResumen: ${total} generados, ${errores} errores`);
  process.exit();
}

main().catch(err => {
  console.error('❌ Error general al generar embeddings:', err);
  process.exit(1);
});
