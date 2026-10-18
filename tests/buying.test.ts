import { describe, it, expect } from 'vitest';
import {
  selectedPrice,
  selectionTotal,
  requestInput,
  sourcingSchema,
  type Sku,
} from '../src/lib/buying';
const red: Sku = {
  id: 'a1000000-0000-4000-8000-000000000001',
  code: 'RED',
  stock: 10,
  active: true,
  image_id: null,
  version: 1,
  options: { Color: 'Red' },
  prices: [
    { min_quantity: 10, price: 9.15 },
    { min_quantity: 1, price: 12 },
  ],
};
const blue: Sku = {
  ...red,
  id: 'a1000000-0000-4000-8000-000000000002',
  code: 'BLUE',
  options: { Color: 'Blue' },
  prices: [
    { min_quantity: 1, price: 15 },
    { min_quantity: 10, price: 11.05 },
  ],
};
describe('wholesale SKU boundaries', () => {
  it('uses the combined quantity for each distinct SKU price', () => {
    expect(selectedPrice(red, 0)).toBe(12);
    expect(selectedPrice(red, 9)).toBe(12);
    expect(selectedPrice(blue, 10)).toBe(11.05);
    expect(
      selectionTotal(
        [red, blue],
        [
          { sku_id: red.id, quantity: 6 },
          { sku_id: blue.id, quantity: 4 },
        ],
      ),
    ).toBe(99.1);
  });
  it('rounds currency per line to cents', () => {
    expect(selectionTotal([red], [{ sku_id: red.id, quantity: 10 }])).toBe(91.5);
  });
  it('rejects missing variants and unbounded requirements before an RPC', () => {
    const v = {
      product_id: red.id,
      kind: 'sample',
      requirements: 'Synthetic sample request',
      branding: '',
      packaging: '',
      specifications: '',
      district: 'Dhaka',
      desired_date: null,
      lines: [{ sku_id: red.id, quantity: 1 }],
    };
    expect(requestInput.safeParse(v).success).toBe(true);
    expect(requestInput.safeParse({ ...v, lines: [] }).success).toBe(false);
    expect(
      requestInput.safeParse({ ...v, lines: [{ sku_id: red.id, quantity: 1.5 }] }).success,
    ).toBe(false);
    expect(requestInput.safeParse({ ...v, requirements: 'x'.repeat(5001) }).success).toBe(false);
  });
  it('rejects reversed preparation estimates and excessive sample quantities', () => {
    const v = {
      product_id: red.id,
      preparation_min: 2,
      preparation_max: 1,
      dispatch_location: '',
      packaging: '',
      delivery_notes: '',
      samples_enabled: true,
      sample_limit: 1,
      customization_enabled: false,
      customization_moq: 5,
      version: 1,
      estimates_updated_at: null,
    };
    expect(sourcingSchema.safeParse(v).success).toBe(false);
    expect(sourcingSchema.safeParse({ ...v, preparation_max: 7, sample_limit: 11 }).success).toBe(
      false,
    );
  });
});

import { quantitiesForTier } from '../src/lib/buying';
describe('selectable wholesale tiers', () => {
  it('allocates an exact target across chosen variants without exceeding stock or adding variants', () => {
    const selection = [
      { sku_id: red.id, quantity: 3 },
      { sku_id: blue.id, quantity: 2 },
    ];
    const result = quantitiesForTier([red, blue], selection, 15)!;
    expect(result.reduce((n, r) => n + r.quantity, 0)).toBe(15);
    expect(result.every((r) => r.quantity <= 10)).toBe(true);
    expect(quantitiesForTier([red, blue], [{ sku_id: red.id, quantity: 3 }], 15)).toBeNull();
    expect(quantitiesForTier([red, blue], selection, 21)).toBeNull();
  });
  it('restores an empty standard quantity and rejects invalid targets', () => {
    expect(quantitiesForTier([red], [], 8)).toEqual([{ sku_id: red.id, quantity: 8 }]);
    expect(quantitiesForTier([red], [], 0)).toBeNull();
    expect(quantitiesForTier([red], [], 1.5)).toBeNull();
    expect(quantitiesForTier([red, blue], [], 8)).toBeNull();
  });
});
