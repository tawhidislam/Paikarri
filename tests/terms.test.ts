import { describe, it, expect } from 'vitest';
import { defaultTerms, validateTerms } from '../src/lib/terms-schema';
describe('terms publishing boundaries', () => {
  it('allows an incomplete private draft but requires an effective date for publication', () => {
    expect(() => validateTerms(defaultTerms)).not.toThrow();
    expect(() => validateTerms(defaultTerms, true)).toThrow('effective date');
    expect(() =>
      validateTerms({ ...defaultTerms, effective_date: '2026-10-18' }, true),
    ).not.toThrow();
  });
  it('requires every section in both languages before publication', () => {
    const draft = {
      ...defaultTerms,
      effective_date: '2026-10-18',
      sections: [{ ...defaultTerms.sections[0], body_bn: ' ' }],
    };
    expect(() => validateTerms(draft)).not.toThrow();
    expect(() => validateTerms(draft, true)).toThrow('both languages');
    expect(() => validateTerms({ ...draft, sections: [] }, true)).toThrow();
  });
  it('rejects impossible dates and oversized content', () => {
    expect(() => validateTerms({ ...defaultTerms, effective_date: '2026-02-30' })).toThrow();
    expect(() =>
      validateTerms({ ...defaultTerms, sections: Array(31).fill(defaultTerms.sections[0]) }),
    ).toThrow();
    expect(() => validateTerms({ ...defaultTerms, intro_en: 'x'.repeat(2001) })).toThrow();
  });
});
