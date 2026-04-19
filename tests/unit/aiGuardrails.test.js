const {
  sanitizeInput,
  parseSchema,
  validateRefs,
  validateImages,
  shouldPersist,
  buildResponseSchema,
  buildSystemPrompt,
  CONFIDENCE_THRESHOLD,
  SIMILARITY_THRESHOLD,
  REASONS,
} = require('../../src/services/aiGuardrails');

describe('aiGuardrails.sanitizeInput', () => {
  it('strips ASCII control chars except \\n and \\t', () => {
    expect(sanitizeInput('\u0000\u0007kaa he e')).toBe('kaa he e');
  });

  it('removes zero-width chars and collapses whitespace', () => {
    expect(sanitizeInput('hola\u200Bmundo   test')).toBe('holamundo test');
  });

  it('returns non-string values unchanged', () => {
    expect(sanitizeInput(42)).toBe(42);
    expect(sanitizeInput(null)).toBe(null);
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });
});

describe('aiGuardrails.validateRefs', () => {
  it('keeps integer refs >= 1', () => {
    const { kept, dropped } = validateRefs([1, 2, 3]);
    expect(kept).toEqual([1, 2, 3]);
    expect(dropped).toEqual([]);
  });

  it('drops non-integers, zero, negatives and duplicates', () => {
    const { kept, dropped } = validateRefs([1, 1, 0, -2, 'x', 2.5, 4]);
    expect(kept).toEqual([1, 4]);
    expect(dropped).toContain(0);
    expect(dropped).toContain(-2);
    expect(dropped).toContain('x');
    expect(dropped).toContain(2.5);
  });

  it('handles non-array input safely', () => {
    expect(validateRefs(null)).toEqual({ kept: [], dropped: [] });
    expect(validateRefs(undefined)).toEqual({ kept: [], dropped: [] });
  });
});

describe('aiGuardrails.validateImages', () => {
  it('keeps only http(s) URLs', () => {
    const input = [
      { nombre: 'a', url: 'https://cdn/x.jpg' },
      { nombre: 'b', url: 'ftp://evil/y.jpg' },
      { nombre: 'c', url: 'not-a-url' },
    ];
    const { valid, invalid } = validateImages(input);
    expect(valid).toHaveLength(1);
    expect(valid[0].url).toBe('https://cdn/x.jpg');
    expect(invalid).toHaveLength(2);
  });

  it('handles missing url field', () => {
    const { valid, invalid } = validateImages([{ nombre: 'a' }, null]);
    expect(valid).toEqual([]);
    expect(invalid).toHaveLength(2);
  });
});

describe('aiGuardrails.parseSchema', () => {
  const okPayload = {
    respuesta: 'El kaa he e es util para la digestion.',
    idpoha_refs: [12, 34],
    imagenes_refs: [{ nombre: 'Kaa he e', url: 'https://cdn/x.jpg' }],
    confianza: 0.82,
    off_topic: false,
  };

  it('accepts schema-conforming payload', () => {
    const r = parseSchema(okPayload);
    expect(r.ok).toBe(true);
    expect(r.payload.idpoha_refs).toEqual([12, 34]);
  });

  it('rejects non-object input', () => {
    expect(parseSchema(null).ok).toBe(false);
    expect(parseSchema('string').ok).toBe(false);
  });

  it('rejects missing or wrong-type fields', () => {
    expect(parseSchema({ ...okPayload, respuesta: 42 }).ok).toBe(false);
    expect(parseSchema({ ...okPayload, idpoha_refs: 'bad' }).ok).toBe(false);
    expect(parseSchema({ ...okPayload, confianza: 2 }).ok).toBe(false);
    expect(parseSchema({ ...okPayload, off_topic: 'yes' }).ok).toBe(false);
  });
});

describe('aiGuardrails.shouldPersist', () => {
  const baseCtx = {
    confianza: 0.8,
    off_topic: false,
    similarityTop1: 0.5,
    keptRefsCount: 2,
  };

  it('persists when everything is OK', () => {
    expect(shouldPersist(baseCtx)).toEqual({ persist: true, reason: REASONS.OK });
  });

  it('rejects when injection detected', () => {
    expect(shouldPersist({ ...baseCtx, injectionDetected: true }))
      .toEqual({ persist: false, reason: REASONS.INJECTION_DETECTED });
  });

  it('rejects when off_topic is true', () => {
    expect(shouldPersist({ ...baseCtx, off_topic: true }))
      .toEqual({ persist: false, reason: REASONS.FUERA_DE_DOMINIO });
  });

  it('rejects below similarity threshold', () => {
    const low = SIMILARITY_THRESHOLD - 0.01;
    expect(shouldPersist({ ...baseCtx, similarityTop1: low }).reason)
      .toBe(REASONS.LOW_SIMILARITY);
  });

  it('rejects below confidence threshold', () => {
    const low = CONFIDENCE_THRESHOLD - 0.01;
    expect(shouldPersist({ ...baseCtx, confianza: low }).reason)
      .toBe(REASONS.LOW_CONFIDENCE);
  });

  it('rejects when no refs survived cross-check', () => {
    expect(shouldPersist({ ...baseCtx, keptRefsCount: 0 }).reason)
      .toBe(REASONS.NO_REFS);
  });

  it('rejects non-object input gracefully', () => {
    expect(shouldPersist(null).persist).toBe(false);
  });
});

describe('aiGuardrails.buildSystemPrompt / buildResponseSchema', () => {
  it('system prompt mentions poha nana and JSON schema', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/poha nana/i);
    expect(prompt).toMatch(/off_topic/);
  });

  it('response schema has required fields and strict=true', () => {
    const s = buildResponseSchema();
    expect(s.strict).toBe(true);
    expect(s.schema.required).toEqual(
      expect.arrayContaining(['respuesta', 'idpoha_refs', 'imagenes_refs', 'confianza', 'off_topic'])
    );
    expect(s.schema.additionalProperties).toBe(false);
  });
});
