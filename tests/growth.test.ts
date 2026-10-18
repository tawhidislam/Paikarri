import { describe, it, expect } from 'vitest';
import { parseCsv, csvText, productColumns, validateProductCsv } from '../src/lib/csv';
import { shippingEstimate, organizationSchema } from '../src/lib/growth';
const preset = {
  enabled: true,
  inside_dhaka_base: 100,
  outside_dhaka_base: 200,
  per_kg_surcharge: 20,
  free_shipping_threshold: 20000,
  carrier_preference: 'self' as const,
};
describe('supplier growth input boundaries', () => {
  it('estimates started kilograms and keeps final pricing separate', () => {
    expect(shippingEstimate(preset, 'Dhaka', 1.1, 100)).toBe(140);
    expect(shippingEstimate(preset, 'Gazipur', 2, 100)).toBe(240);
    expect(shippingEstimate(preset, 'Dhaka', 2, 20000)).toBe(0);
    expect(shippingEstimate(preset, 'Dhaka', NaN, 100)).toBeNull();
  });
  it('parses quoted multiline CSV and protects spreadsheet formulas', () => {
    expect(parseCsv('a,b\r\n"hello, there","line\nnext"')).toEqual([
      ['a', 'b'],
      ['hello, there', 'line\nnext'],
    ]);
    expect(csvText([['=HYPERLINK("bad")']])).toContain("'=HYPERLINK");
    expect(() => parseCsv('"unfinished')).toThrow();
  });
  it('validates every import row and preserves category ownership boundaries', () => {
    const category = { id: '66000000-0000-4000-8000-000000000001', slug: 'apparel' };
    const text = csvText([
      [...productColumns],
      [
        'Cotton shirt',
        '',
        'A real cotton shirt description',
        'apparel',
        100,
        10,
        100,
        'piece',
        '{}',
        '[]',
      ],
    ]);
    expect(validateProductCsv(text, [category])[0].product?.price).toBe(100);
    expect(validateProductCsv(text, [])[0].error).toContain('category');
  });
  it('does not treat a corporate profile as verified and preserves leading-zero licence IDs', () => {
    expect(
      organizationSchema.parse({
        name: 'Synthetic Retailers',
        business_type: 'retailer',
        trade_license_number: '0000123',
        address: '',
      }).trade_license_number,
    ).toBe('0000123');
    expect(organizationSchema.safeParse({ name: 'x', business_type: 'admin' }).success).toBe(false);
  });
});
