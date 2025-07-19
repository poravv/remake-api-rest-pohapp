const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const sequelize = require('../database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s,.()\u00C0-\u017F]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

    const [filas] = await sequelize.query(`SELECT idpoha, embedding FROM medicina_embeddings`);
    const resultados = [];

    for (const fila of filas) {
      try {
        const vector = typeof fila.embedding === 'string' ? JSON.parse(fila.embedding) : fila.embedding;
        if (!Array.isArray(vector)) continue;
        const score = cosineSimilarity(vector, inputVector);
        resultados.push({ idpoha: fila.idpoha, score });
      } catch (error) {
        console.warn(`⚠️ Embedding inválido para idpoha ${fila.idpoha}:`, error.message);
      }
    }

    resultados.sort((a, b) => b.score - a.score);
    const top = resultados.filter(r => r.score >= 0.40).slice(0, 5);
    const ids = top.map(r => r.idpoha);

    if (!ids.length) {
      return res.json({
        ids: [],
        explicacion: "No tengo información para tu pregunta.",
        imagenes: [],
        sugerencia: 'No se encontraron plantas relevantes. Intenta reformular tu pregunta.',
      });
    }

    const [plantas] = await sequelize.query(`
      SELECT idpoha, texto_entrenamiento, plantas_detalle_json
      FROM vw_medicina_entrenamiento
      WHERE idpoha IN (${ids.map(() => '?').join(',')})
    `, { replacements: ids });

    //const contextoActual = plantas.map(p => `Planta ${p.idpoha}:${p.texto_entrenamiento}`).join('\n\n');
    const contextoActual = plantas.map(p => {
      let nombre = `Planta ${p.idpoha}`;
      try {
        const detalle = typeof p.plantas_detalle_json === 'string'
          ? JSON.parse(p.plantas_detalle_json)
          : p.plantas_detalle_json;

        if (Array.isArray(detalle) && detalle.length > 0) {
          nombre = detalle.map(pl => pl.nombre).join(', ');
        }
      } catch (e) {
        console.warn(`⚠️ No se pudo parsear nombre de planta para idpoha ${p.idpoha}`);
      }

      return `${nombre}:\n${p.texto_entrenamiento}`;
    }).join('\n\n');



    // Cargar historial reciente (últimos 15 minutos)
    const [historial] = await sequelize.query(`
      SELECT pregunta, respuesta FROM chat_historial
      WHERE idusuario = ? AND fecha >= NOW() - INTERVAL 15 MINUTE
      ORDER BY fecha ASC
    `, { replacements: [idusuario] });

    const mensajesPrevios = historial.flatMap(h => [
      { role: 'user', content: h.pregunta },
      { role: 'assistant', content: h.respuesta }
    ]);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente conversacional experto en plantas medicinales del Paraguay y sus propiedades para resolver dolencias con ellas. 
          Responde de forma clara y útil, solo sobre lo que se pregunta. 
          Si se piden detalles como imágenes, familias, o nombres científicos, solo entonces debes incluirlos.
          No incluyas información adicional o irrelevante.
          Manten conversaciones cortas y al punto, evitando repeticiones innecesarias en lenguaje natural.`
        },
        ...mensajesPrevios,
        {
          role: 'user',
          content: contextoActual ? `${pregunta}\n\nTen en cuenta la información de la conversación actual:\n${contextoActual}` : pregunta
        }
      ],
      temperature: 0.7,
    });

    const explicacion = completion.choices[0]?.message?.content || 'No se pudo generar una respuesta.';

    const explicacionLower = explicacion.toLowerCase();

    const imagenesSet = new Set();
    const imagenes = [];

    for (const p of plantas) {
      try {
        const raw = typeof p.plantas_detalle_json === 'string'
          ? JSON.parse(p.plantas_detalle_json)
          : p.plantas_detalle_json;

        if (!Array.isArray(raw)) continue;

        for (const planta of raw) {
          const nombresPosibles = [
            planta.nombre,
            planta.nombre?.split('(')[0]?.trim(), // Santa Lucía
            planta.nombre_cientifico,
          ].filter(Boolean).map(n => n.toLowerCase());

          const coincide = nombresPosibles.some(nombre =>
            explicacionLower.includes(nombre)
          );

          const clave = `${planta.nombre}|${planta.imagen}`;
          if (coincide && !imagenesSet.has(clave)) {
            imagenes.push(planta);
            imagenesSet.add(clave);
          }
        }
      } catch (e) {
        console.warn(`❌ Error al parsear JSON de idpoha ${p.idpoha}:`, e.message);
      }
    }

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
