import { describe, expect, it } from 'vitest';
import { previewCartRows } from '../src/lib/cart-pricing';
import type { CartRow } from '../src/lib/order-schema';
import type { ProductOptions } from '../src/lib/buying';
const row: CartRow = {
  product_id: 'p',
  sku_id: 'green',
  business_id: 'b',
  supplier_name: 'Synthetic',
  name: 'Chair',
  name_bn: '',
  unit: 'piece',
  quantity: 4,
  moq: 8,
  stock: 1000,
  unit_price: 1950,
  available: true,
};
const rows = [row, { ...row, sku_id: 'cream', unit_price: 2050 }];
const options = new Map<string, ProductOptions>([
  [
    'p',
    {
      attributes: [],
      sourcing: {
        product_id: 'p',
        preparation_min: 1,
        preparation_max: 2,
        dispatch_location: '',
        packaging: '',
        delivery_notes: '',
        samples_enabled: false,
        sample_limit: 1,
        customization_enabled: false,
        customization_moq: 8,
        estimates_updated_at: null,
        version: 1,
      },
      skus: ['green', 'cream'].map((id, i) => ({
        id,
        code: id,
        stock: 1000,
        active: true,
        image_id: null,
        version: 1,
        options: {},
        prices: [
          { min_quantity: 1, price: 1950 + i * 100 },
          { min_quantity: 24, price: 1853 + i * 100 },
          { min_quantity: 80, price: 1755 + i * 100 },
        ],
      })),
    },
  ],
]);
describe('cart quantity pricing previews', () => {
  it('reprices every selected variant at the combined quantity without mutating saved quotes', () => {
    const preview = previewCartRows(rows, { green: 20 }, options);
    expect(preview.map((r) => [r.quantity, r.unit_price])).toEqual([
      [20, 1853],
      [4, 1953],
    ]);
    expect(rows.map((r) => [r.quantity, r.unit_price])).toEqual([
      [4, 1950],
      [4, 2050],
    ]);
  });
  it('keeps saved server prices when there are no edits, so stale prices remain detectable', () => {
    const saved = rows.map((r) => ({ ...r, quantity: 12, unit_price: 2000 }));
    expect(previewCartRows(saved, {}, options)).toEqual(saved);
  });
  it('retains saved amounts for incomplete or impossible product selections', () => {
    for (const quantity of [NaN, 0, 1.5, 3, 1001, 1000001])
      expect(previewCartRows(rows, { green: quantity }, options)).toEqual(rows);
  });
  it('never borrows another SKU price or invents a discount when options are unavailable', () => {
    expect(previewCartRows(rows, { green: 20 }, new Map())[0].unit_price).toBe(1950);
    expect(
      previewCartRows([{ ...row, sku_id: 'unavailable' }], { unavailable: 24 }, options)[0]
        .unit_price,
    ).toBe(1950);
  });
});
