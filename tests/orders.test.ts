import { describe, it, expect } from 'vitest';
import {
  deliverySchema,
  checkoutExpected,
  cartSubtotal,
  validateOrderAction,
  orderDetailSchema,
  type CartRow,
} from '../src/lib/order-schema';
const address = {
  name: 'Synthetic Buyer',
  phone: '01712345678',
  division: 'Dhaka',
  district: 'Dhaka',
  address: 'Synthetic Road 10, Dhaka',
};
const row = {
  product_id: 'a1000000-0000-4000-8000-000000000001',
  business_id: 'b1000000-0000-4000-8000-000000000001',
  supplier_name: 'Synthetic',
  name: 'Test',
  name_bn: '',
  unit: 'piece',
  quantity: 10,
  moq: 5,
  stock: 100,
  unit_price: 10.15,
  available: true,
} satisfies CartRow;
describe('wholesale order input boundaries', () => {
  it('accepts Bangladesh mobile formats without losing leading zeros', () => {
    expect(deliverySchema.parse(address).phone).toBe('01712345678');
    expect(deliverySchema.parse({ ...address, phone: '+8801712345678' }).phone).toBe(
      '+8801712345678',
    );
  });
  it('rejects mismatched division/district and invalid mobile numbers', () => {
    expect(deliverySchema.safeParse({ ...address, district: 'Sylhet' }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...address, phone: '12345' }).success).toBe(false);
  });
  it('requires explanations for cancellations, disputes and decisions', () => {
    for (const a of [
      'cancel',
      'request_cancel',
      'decline_cancel',
      'dispute',
      'resolve_cancel',
      'resolve_resume',
      'resolve_complete',
    ] as const)
      expect(() => validateOrderAction(a, { note: 'short' })).toThrow();
  });
  it('requires external references for payment and refund records', () => {
    for (const a of ['report_payment', 'confirm_payment', 'confirm_refund'] as const)
      expect(() => validateOrderAction(a, {})).toThrow();
  });
  it('validates delivery charges and shipment identifiers', () => {
    expect(() => validateOrderAction('confirm', { shipping_fee: -1 })).toThrow();
    expect(() => validateOrderAction('confirm', { shipping_fee: 1.001 })).toThrow();
    expect(() => validateOrderAction('ship', { carrier: '', tracking_number: 'x' })).toThrow();
    expect(validateOrderAction('confirm', { shipping_fee: 0 }).shipping_fee).toBe(0);
  });
  it('builds deterministic expected-price snapshots and uses minor units for totals', () => {
    const b = { ...row, product_id: '91000000-0000-4000-8000-000000000001', quantity: 3 };
    expect(checkoutExpected([row, b])[0].product_id).toBe(b.product_id);
    expect(cartSubtotal([row, b])).toBe(131.95);
    expect(checkoutExpected([row])[0]).toEqual({
      product_id: row.product_id,
      quantity: 10,
      unit_price: 10.15,
    });
  });
  it('rejects incomplete order responses instead of rendering false totals', () => {
    expect(orderDetailSchema.safeParse({ id: row.product_id, total: 0 }).success).toBe(false);
  });
});
