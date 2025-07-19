const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const sequelize = require('../database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });;

// Normalizador para texto plano
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s,.()áéíóúñ]/gi, '') // permite acentos, comas, etc.
    .replace(/\s+/g, ' ')
    .trim();
}

// Cálculo de similitud coseno
function cosineSimilarity(vec1, vec2) {
  const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
  return dot / (mag1 * mag2);
}

router.post('/', async (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta) return res.status(400).json({ error: 'Falta la pregunta' });

  try {
    const cleanInput = normalize(pregunta);

    // Obtener embedding de la pregunta
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: cleanInput,
    });

    const inputVector = embedding.data[0].embedding;

    // Obtener embeddings almacenados
    const [filas] = await sequelize.query(`
      SELECT idpoha, embedding, resumen
      FROM medicina_embeddings
    `);

    const resultados = [];
    // Comparar similitud
    for (const fila of filas) {
      try {
        let vector = fila.embedding;

        if (typeof vector === 'string') {
          vector = JSON.parse(vector);
        }

        if (!Array.isArray(vector) || vector.length === 0) continue;

        const score = cosineSimilarity(vector, inputVector);
        resultados.push({
          idpoha: fila.idpoha,
          score,
          resumen: fila.resumen,
        });
      } catch (error) {
        console.warn(`❌ Embedding inválido para idpoha ${fila.idpoha}:`, error.message);
      }
    }



    // Ordenar por relevancia
    resultados.sort((a, b) => b.score - a.score);

    // Filtrar resultados relevantes (ajustable)
    const threshold = 0.55;
    const topN = 5;
    const relevantes = resultados.filter(r => r.score >= threshold).slice(0, topN);

    res.json({
      pregunta: cleanInput,
      resultados: relevantes,
      total: relevantes.length,
      sugerencia: relevantes.length === 0
        ? 'Ajusta el texto de búsqueda o entrena mejor tus embeddings.'
        : undefined,
    });
  } catch (err) {
    console.error('Error en /query-nlp/preview:', err);
    res.status(500).json({ error: 'Error al procesar la pregunta' });
  }
});

module.exports = router;
