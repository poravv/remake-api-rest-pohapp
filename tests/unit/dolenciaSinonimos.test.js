const embeddingCache = require('../../src/services/embeddingCache');
const {
  ENRICHMENT_MAX_CHARS,
  buildEnrichment,
  matchedSinonimos,
  questionTemplates,
} = require('../../src/services/dolenciaSinonimos');

describe('dolenciaSinonimos', () => {
  it('should_append_accent_insensitive_migraine_synonyms', () => {
    const enrichment = buildEnrichment('Migraña dolor de cabeza');

    expect(enrichment).toContain('jaqueca');
    expect(enrichment).toContain('cefalea');
    expect(enrichment).toContain('dolor de cabeza fuerte');
  });

  it('should_return_matching_forms_without_accents', () => {
    expect(matchedSinonimos('MIGRANA DOLOR DE CABEZA')).toEqual(
      expect.arrayContaining(['jaqueca', 'cefalea'])
    );
  });

  it('should_generate_three_deterministic_question_templates', () => {
    expect(questionTemplates('Dolor de garganta')).toEqual([
      '¿Qué sirve para Dolor de garganta?',
      'Remedio natural para Dolor de garganta',
      'Me duele/tengo Dolor de garganta',
    ]);
  });

  it('should_respect_the_enrichment_cap', () => {
    const enrichment = buildEnrichment(
      'Migraña dolor de cabeza, Gripe, resfríos y congestión nasal, Tos irritativa, ' +
        'Dolor de barriga - Alteración de tracto gastrointestinal',
      ENRICHMENT_MAX_CHARS
    );

    expect(enrichment.length).toBeLessThanOrEqual(ENRICHMENT_MAX_CHARS);
    expect(enrichment).toContain('Formas comunes de preguntar:');
    expect(enrichment).toContain('¿Qué sirve para');
    expect(enrichment).toContain('Remedio natural para');
    expect(enrichment).toContain('Me duele/tengo');
  });

  it('should_change_hash_when_enrichment_changes', () => {
    const base = 'Dolencias que trata: Anís.';
    const original = `${base}${buildEnrichment('Migraña dolor de cabeza')}`;
    const changed = `${base}${buildEnrichment('Migraña dolor de cabeza y fiebre')}`;

    expect(original).toContain('jaqueca');
    expect(changed).toContain('calentura');
    expect(embeddingCache.hashOf(original)).not.toBe(embeddingCache.hashOf(changed));
  });
});
