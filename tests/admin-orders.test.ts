import { describe, it, expect } from 'vitest';
import { adminQueueFilter, adminOrderSearch, bangladeshContact } from '../src/lib/admin-orders';
describe('order operations query boundaries', () => {
  it('uses a server union for attention rather than adding overlapping totals', () => {
    expect(adminQueueFilter('action_required')).toBe(
      'status.eq.disputed,payment_status.in.(reported,refund_pending)',
    );
    expect(adminQueueFilter('reported')).toBe('payment_status.eq.reported');
    expect(adminQueueFilter('fulfilment')).toBe('status.in.(processing,shipped)');
    expect(() => adminQueueFilter('disputed),id.neq.0')).toThrow();
  });
  it('matches displayed order numbers and contains punctuation inside quoted name terms', () => {
    expect(adminOrderSearch('PK-000101')).toContain('number.eq.101');
    expect(adminOrderSearch('ACME, Ltd')).toContain('ilike."%ACME, Ltd%"');
    expect(adminOrderSearch('"x\\"')).toBe('supplier_name.ilike."%x%",buyer_name.ilike."%x%"');
    expect(adminOrderSearch(' ')).toBe('');
  });
  it('only offers contact links for valid Bangladesh mobile numbers', () => {
    expect(bangladeshContact('01712345678')).toEqual({
      tel: '+8801712345678',
      whatsapp: '8801712345678',
    });
    expect(bangladeshContact('javascript:alert(1)')).toBeNull();
    expect(bangladeshContact('+880 1712-345678')?.whatsapp).toBe('8801712345678');
  });
});
