/**
 * Transparent, deterministic vocabulary expansion for RAG embeddings.
 *
 * `match` contains the words/phrases used in the dolencias catalog. The
 * resulting `formas` are common ways a user may describe the same ailment.
 * Keep this as code (rather than a DB/config dependency) so regen is stable
 * across the API and the CI embedding job.
 */
const DOLENCIA_SINONIMOS = {
  migraña: {
    match: ['migraña', 'cefalea', 'dolor de cabeza'],
    formas: ['jaqueca', 'cefalea', 'dolor de cabeza fuerte', 'me parte la cabeza'],
  },
  tos: {
    match: ['tos', 'tos irritativa'],
    formas: ['catarro', 'tos seca', 'tos con flema', 'carraspeo'],
  },
  fiebre: {
    match: ['fiebre'],
    formas: ['temperatura', 'calentura', 'estoy afiebrado'],
  },
  diarrea: {
    match: ['diarrea'],
    formas: ['vientre suelto', 'evacuaciones líquidas', 'descompostura'],
  },
  estreñimiento: {
    match: ['estreñimiento'],
    formas: ['constipación', 'dificultad para evacuar', 'trancazón'],
  },
  gripe: {
    match: ['gripe', 'resfrío', 'resfríos', 'congestión nasal', 'catarro'],
    formas: ['resfriado', 'nariz tapada', 'moqueo', 'estado gripal'],
  },
  garganta: {
    match: ['dolor de garganta'],
    formas: ['garganta irritada', 'ardor de garganta', 'me duele la garganta'],
  },
  estomago: {
    match: [
      'dolor de estómago',
      'dolor de barriga',
      'alteración de tracto gastrointestinal',
      'problemas digestivos',
      'trastornos digestivos',
      'transtornos digestivos',
      'gastritis',
      'úlceras estomacales',
      'acidez estomacal',
    ],
    formas: ['dolor de panza', 'dolor abdominal', 'mal de estómago', 'ardor estomacal'],
  },
  gases: {
    match: ['gases', 'cólicos', 'colicos'],
    formas: ['flatulencia', 'barriga inflamada', 'hinchazón', 'retortijones'],
  },
  insomnio: {
    match: ['insomnio'],
    formas: ['no puedo dormir', 'falta de sueño', 'desvelo'],
  },
  ansiedad: {
    match: ['ansiedad', 'nervios', 'relaja el sistema nervioso', 'relajante'],
    formas: ['estrés', 'angustia', 'preocupación', 'estoy nervioso'],
  },
  presion: {
    match: ['presión alta', 'presion arterial', 'control de presion arterial'],
    formas: ['hipertensión', 'presión elevada', 'tensión alta'],
  },
  quemaduras: {
    match: ['quemadura', 'quemaduras'],
    formas: ['piel quemada', 'me quemé', 'ardor por quemadura'],
  },
  heridas: {
    match: ['herida', 'heridas'],
    formas: ['cortaduras', 'lastimaduras', 'raspones'],
  },
  golpes: {
    match: ['golpe', 'golpes', 'moretón', 'moretones'],
    formas: ['contusiones', 'hematomas', 'chichones'],
  },
  muscular: {
    match: ['dolor muscular', 'dolores musculares'],
    formas: ['músculos adoloridos', 'contractura', 'dolor de cuerpo'],
  },
  articulaciones: {
    match: ['reuma', 'reumatismo', 'artritis', 'dolores articulares'],
    formas: ['dolor de articulaciones', 'dolor de coyunturas', 'rigidez articular'],
  },
  riñones: {
    match: ['riñón', 'riñones', 'orina', 'urinario'],
    formas: ['dolor de riñón', 'problemas urinarios', 'ardor al orinar'],
  },
  higado: {
    match: ['hígado'],
    formas: ['problemas hepáticos', 'dolor de hígado'],
  },
  parasitos: {
    match: ['parásitos', 'parasitos'],
    formas: ['lombrices', 'bichos intestinales', 'gusanos'],
  },
  anemia: {
    match: ['anemia'],
    formas: ['falta de hierro', 'debilidad por anemia', 'cansancio'],
  },
  menstruacion: {
    match: ['menstruación', 'menstruaciones', 'menstrual', 'dolores menstruales', 'regla'],
    formas: ['período', 'dolor de regla', 'cólicos menstruales'],
  },
  nauseas: {
    match: ['náusea', 'náuseas', 'vómito', 'vomito'],
    formas: ['ganas de vomitar', 'devolver', 'arcadas'],
  },
  mareo: {
    match: ['mareo', 'mareos'],
    formas: ['vértigo', 'cabeza ligera', 'sensación de desmayo'],
  },
  alergia: {
    match: ['alergia', 'alergias'],
    formas: ['reacción alérgica', 'estornudos', 'picazón'],
  },
  piel: {
    match: ['piel', 'granos', 'acné', 'afecciones a la piel'],
    formas: ['espinillas', 'brotes', 'barritos', 'irritación de la piel'],
  },
  cabello: {
    match: ['caída de cabello', 'caida de cabello'],
    formas: ['se me cae el pelo', 'pérdida de cabello', 'alopecia'],
  },
  colesterol: {
    match: ['colesterol'],
    formas: ['colesterol alto', 'grasa en la sangre'],
  },
  diabetes: {
    match: ['diabetes', 'azúcar', 'azucar', 'glucosa'],
    formas: ['azúcar alta', 'glucosa alta', 'problemas de azúcar'],
  },
  digestion: {
    match: ['digestivo', 'digestivos', 'digestión', 'irritación intestinal', 'hinchazón abdominal'],
    formas: ['malestar digestivo', 'panza hinchada', 'intestino irritado'],
  },
  aliento: {
    match: ['mal aliento'],
    formas: ['halitosis', 'mal olor de boca', 'olor desagradable en la boca'],
  },
  menopausia: {
    match: ['menopausia'],
    formas: ['sofocos', 'cambios hormonales', 'calores de la menopausia'],
  },
  circulacion: {
    match: ['circulación', 'circulacion de la sangre'],
    formas: ['mala circulación', 'problemas circulatorios', 'sangre que no circula bien'],
  },
  retencion: {
    match: ['retención de líquido', 'retencion de liquido'],
    formas: ['hinchazón por líquidos', 'edema', 'acumulación de líquido'],
  },
  defensas: {
    match: ['depresión inmunitaria', 'depresion inmunitaria'],
    formas: ['defensas bajas', 'sistema inmune débil', 'bajas defensas'],
  },
  inflamacion: {
    match: ['desinflamante', 'inflamación', 'inflamacion'],
    formas: ['hinchazón', 'inflamación del cuerpo', 'desinflamar'],
  },
  corazon: {
    match: ['contracción del miocardio', 'contraccion del miocardio'],
    formas: ['corazón', 'palpitaciones', 'molestias cardíacas'],
  },
};

const ENRICHMENT_MAX_CHARS = 600;

function normalizeForMatch(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsPhrase(text, phrase) {
  const normalizedText = normalizeForMatch(text);
  const normalizedPhrase = normalizeForMatch(phrase);
  if (!normalizedText || !normalizedPhrase) return false;
  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
}

function uniquePhrases(phrases) {
  const seen = new Set();
  return phrases.filter((phrase) => {
    const key = normalizeForMatch(phrase);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchedSinonimos(dolencias) {
  const formas = [];
  for (const entry of Object.values(DOLENCIA_SINONIMOS)) {
    if (entry.match.some((term) => containsPhrase(dolencias, term))) {
      formas.push(...entry.formas);
    }
  }
  return uniquePhrases(formas);
}

function questionTemplates(dolencias) {
  const target = String(dolencias || '').replace(/\s+/g, ' ').trim();
  if (!target) return [];
  return [
    `¿Qué sirve para ${target}?`,
    `Remedio natural para ${target}`,
    `Me duele/tengo ${target}`,
  ];
}

function buildEnrichment(dolencias, maxChars = ENRICHMENT_MAX_CHARS) {
  const formas = uniquePhrases([
    ...questionTemplates(dolencias),
    ...matchedSinonimos(dolencias),
  ]);
  if (formas.length === 0 || maxChars <= 0) return '';

  const prefix = ' Formas comunes de preguntar: ';
  let section = prefix;
  for (const forma of formas) {
    const separator = section === prefix ? '' : '; ';
    const next = `${section}${separator}${forma}`;
    if (next.length > maxChars) break;
    section = next;
  }
  return section === prefix ? '' : section;
}

module.exports = {
  DOLENCIA_SINONIMOS,
  ENRICHMENT_MAX_CHARS,
  normalizeForMatch,
  matchedSinonimos,
  questionTemplates,
  buildEnrichment,
};
