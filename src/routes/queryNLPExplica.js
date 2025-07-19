
const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const sequelize = require('../database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Normalizador
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s,.()áéíóúñ]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Similitud coseno
function cosineSimilarity(vec1, vec2) {
  const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
  return dot / (mag1 * mag2);
}

router.post('/', async (req, res) => {
  const { pregunta, idusuario } = req.body;

  if (!pregunta || !idusuario) {
    return res.status(400).json({ error: 'Faltan datos requeridos: pregunta o idusuario' });
  }

  try {
    const input = normalize(pregunta);

    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    });

    const inputVector = embedding.data[0].embedding;

    const [filas] = await sequelize.query(`
      SELECT idpoha, embedding
      FROM medicina_embeddings
    `);

    const resultados = [];

    for (const fila of filas) {
      try {
        const vector = typeof fila.embedding === 'string'
          ? JSON.parse(fila.embedding)
          : fila.embedding;

        if (!Array.isArray(vector)) continue;

        const score = cosineSimilarity(vector, inputVector);
        resultados.push({ idpoha: fila.idpoha, score });
      } catch (error) {
        console.warn(`⚠️ Embedding inválido para idpoha ${fila.idpoha}:`, error.message);
      }
    }

    resultados.sort((a, b) => b.score - a.score);
    const top = resultados.filter(r => r.score >= 0.55).slice(0, 5);
    const ids = top.map(r => r.idpoha);

    if (!ids.length) {
      return res.json({
        explicacion: null,
        sugerencia: 'No se encontraron plantas relevantes. Intenta reformular tu pregunta.',
      });
    }

    const [plantas] = await sequelize.query(`
      SELECT idpoha, texto_entrenamiento, plantas_detalle_json
      FROM vw_medicina_entrenamiento
      WHERE idpoha IN (${ids.map(() => '?').join(',')})
    `, { replacements: ids });

    const contexto = plantas.map(p => `Planta ${p.idpoha}:\n${p.texto_entrenamiento}`).join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente experto en plantas medicinales del Paraguay. 
Responde en lenguaje claro y humano. Si el usuario pregunta por imágenes, nombres científicos o familias de las plantas, incluye esos datos. Si no lo pregunta, omítelos.`
        },
        {
          role: 'user',
          content: `Una persona pregunta: "${pregunta}". Según esta información, responde:\n\n${contexto}`
        }
      ],
      temperature: 0.7,
    });

    const explicacion = completion.choices[0]?.message?.content || 'No se pudo generar una respuesta.';

    const imagenes = plantas.flatMap(p => {
      try {
        const raw = typeof p.plantas_detalle_json === 'string'
          ? JSON.parse(p.plantas_detalle_json)
          : p.plantas_detalle_json;

        return Array.isArray(raw) ? raw : [];
      } catch (e) {
        console.warn(`❌ Error al parsear JSON de idpoha ${p.idpoha}:`, e.message);
        return [];
      }
    });

    // Guardar en historial con idusuario
    await sequelize.query(`
      INSERT INTO chat_historial (idusuario, pregunta, respuesta, idpoha_json, imagenes_json)
      VALUES (:idusuario, :pregunta, :respuesta, :idpoha_json, :imagenes_json)
    `, {
      replacements: {
        idusuario,
        pregunta,
        respuesta: explicacion,
        idpoha_json: JSON.stringify(ids),
        imagenes_json: JSON.stringify(imagenes),
      },
    });

    res.json({ ids, explicacion, imagenes });

  } catch (error) {
    console.error('❌ Error en /query-nlp/explica:', error);
    res.status(500).json({ error: 'Error al generar la respuesta.' });
  }
});

module.exports = router;
