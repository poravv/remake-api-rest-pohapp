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

async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
    });
    return response.data[0].embedding;
}

async function getStoredEmbeddings() {
    const [filas] = await sequelize.query('SELECT idpoha, embedding FROM medicina_embeddings');
    return filas;
}

async function getStoredEmbeddingsWithResumen() {
    const [filas] = await sequelize.query('SELECT idpoha, embedding, resumen FROM medicina_embeddings');
    return filas;
}

function rankBySimilarity(filas, inputVector, threshold, topN) {
    const resultados = [];

    for (const fila of filas) {
        try {
            const vector = typeof fila.embedding === 'string' ? JSON.parse(fila.embedding) : fila.embedding;
            if (!Array.isArray(vector) || vector.length === 0) continue;
            const score = cosineSimilarity(vector, inputVector);
            resultados.push({ idpoha: fila.idpoha, score, resumen: fila.resumen || undefined });
        } catch (error) {
            console.warn(`Embedding invalido para idpoha ${fila.idpoha}:`, error.message);
        }
    }

    resultados.sort((a, b) => b.score - a.score);
    return resultados.filter(r => r.score >= threshold).slice(0, topN);
}

async function queryWithExplanation(pregunta, idusuario) {
    const input = normalize(pregunta);
    const inputVector = await generateEmbedding(input);
    const filas = await getStoredEmbeddings();
    const top = rankBySimilarity(filas, inputVector, 0.40, 5);
    const ids = top.map(r => r.idpoha);

    if (!ids.length) {
        return {
            ids: [],
            explicacion: "No tengo informacion para tu pregunta.",
            imagenes: [],
            sugerencia: 'No se encontraron plantas relevantes. Intenta reformular tu pregunta.',
        };
    }

    const [plantas] = await sequelize.query(`
        SELECT idpoha, texto_entrenamiento, plantas_detalle_json
        FROM vw_medicina_entrenamiento
        WHERE idpoha IN (${ids.map(() => '?').join(',')})
    `, { replacements: ids });

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
            console.warn(`No se pudo parsear nombre de planta para idpoha ${p.idpoha}`);
        }

        return `${nombre}:\n${p.texto_entrenamiento}`;
    }).join('\n\n');

    // Load recent chat history (last 15 minutes)
    const [historial] = await sequelize.query(`
        SELECT pregunta, respuesta FROM chat_historial
        WHERE idusuario = ? AND fecha >= NOW() - INTERVAL 15 MINUTE
        ORDER BY fecha ASC
    `, { replacements: [idusuario] });

    const mensajesPrevios = historial.flatMap(h => [
        { role: 'user', content: h.pregunta },
        { role: 'assistant', content: h.respuesta },
    ]);

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `Eres un asistente conversacional experto en plantas medicinales del Paraguay y sus propiedades para resolver dolencias con ellas.
          Responde de forma clara y util, solo sobre lo que se pregunta.
          Si se piden detalles como imagenes, familias, o nombres cientificos, solo entonces debes incluirlos.
          No incluyas informacion adicional o irrelevante.
          Manten conversaciones cortas y al punto, evitando repeticiones innecesarias en lenguaje natural.`,
            },
            ...mensajesPrevios,
            {
                role: 'user',
                content: contextoActual ? `${pregunta}\n\nTen en cuenta la informacion de la conversacion actual:\n${contextoActual}` : pregunta,
            },
        ],
        temperature: 0.7,
    });

    const explicacion = completion.choices[0]?.message?.content || 'No se pudo generar una respuesta.';
    const explicacionLower = explicacion.toLowerCase();

    // Extract relevant plant images from explanation
    const imagenesSet = new Set();
    const imagenes = [];

    for (const p of plantas) {
        try {
            const raw = typeof p.plantas_detalle_json === 'string'
                ? JSON.parse(p.plantas_detalle_json)
                : p.plantas_detalle_json;

            if (!Array.isArray(raw)) continue;

            for (const plantaItem of raw) {
                const nombresPosibles = [
                    plantaItem.nombre,
                    plantaItem.nombre?.split('(')[0]?.trim(),
                    plantaItem.nombre_cientifico,
                ].filter(Boolean).map(n => n.toLowerCase());

                const coincide = nombresPosibles.some(nombre =>
                    explicacionLower.includes(nombre),
                );

                const clave = `${plantaItem.nombre}|${plantaItem.imagen}`;
                if (coincide && !imagenesSet.has(clave)) {
                    imagenes.push(plantaItem);
                    imagenesSet.add(clave);
                }
            }
        } catch (e) {
            console.warn(`Error al parsear JSON de idpoha ${p.idpoha}:`, e.message);
        }
    }

    // Save to chat history
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

    return { ids, explicacion, imagenes };
}

async function queryPreview(pregunta) {
    const cleanInput = normalize(pregunta);
    const inputVector = await generateEmbedding(cleanInput);
    const filas = await getStoredEmbeddingsWithResumen();
    const relevantes = rankBySimilarity(filas, inputVector, 0.55, 5);

    return {
        pregunta: cleanInput,
        resultados: relevantes,
        total: relevantes.length,
        sugerencia: relevantes.length === 0
            ? 'Ajusta el texto de busqueda o entrena mejor tus embeddings.'
            : undefined,
    };
}

async function getChatHistory(idusuario) {
    const [historial] = await sequelize.query(`
        SELECT id, pregunta, respuesta, fecha, idpoha_json, imagenes_json
        FROM chat_historial
        WHERE idusuario = :idusuario
        ORDER BY fecha DESC
        LIMIT 50
    `, {
        replacements: { idusuario },
    });

    return { historial };
}

module.exports = {
    normalize,
    cosineSimilarity,
    generateEmbedding,
    queryWithExplanation,
    queryPreview,
    getChatHistory,
};
