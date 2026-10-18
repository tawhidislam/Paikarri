import { describe, expect, it } from 'vitest';
import { normalizeSearch, searchHref, suggestionsSchema } from '../src/lib/search';
describe('catalog search inputs', () => {
  it('normalizes Unicode and whitespace while preserving Bangla', () => {
    expect(normalizeSearch('  cotton\n\t shirt  ')).toBe('cotton shirt');
    expect(normalizeSearch('  সুতি  জামা ')).toBe('সুতি জামা');
    expect(normalizeSearch('Ｃｏｔｔｏｎ')).toBe('Cotton');
    expect(normalizeSearch('x'.repeat(200))).toHaveLength(160);
  });
  it('encodes query data without introducing extra filters or paths', () => {
    expect(searchHref(' ')).toBe('/products');
    expect(searchHref('cotton & verified=true')).toBe('/products?q=cotton%20%26%20verified%3Dtrue');
    expect(new URL(searchHref('সুতি জামা'), 'http://localhost').searchParams.get('q')).toBe(
      'সুতি জামা',
    );
  });
  it('rejects malformed backend payloads rather than rendering unsafe links', () => {
    expect(
      suggestionsSchema.safeParse({
        products: [],
        categories: [{ id: 'not-a-uuid', name: 'x', name_bn: '', slug: 'x' }],
      }).success,
    ).toBe(false);
    expect(suggestionsSchema.safeParse({ products: [], categories: [] }).success).toBe(true);
  });
});
