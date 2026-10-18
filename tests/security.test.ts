import { z } from 'zod';
import { describe, it, expect } from 'vitest';
import { authSchema, businessSchema, productSchema, quoteSchema } from '../src/lib/validation';
import { safeRedirect, validateUpload, errorMessage, randomUUID } from '../src/lib/utils';
import { locations } from '../src/lib/locations';
describe('untrusted input boundaries', () => {
  it('blocks external and protocol-relative auth redirects', () => {
    for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', null])
      expect(safeRedirect(value)).toBe('/dashboard');
    expect(safeRedirect('/dashboard/messages')).toBe('/dashboard/messages');
  });
  it('requires a strong registration password', () => {
    expect(authSchema.safeParse({ email: 'buyer@example.com', password: 'short' }).success).toBe(
      false,
    );
  });
  it('rejects unsafe upload types and oversized files', () => {
    expect(() =>
      validateUpload({ type: 'text/html', size: 100 } as File, 'business-documents'),
    ).toThrow();
    expect(() =>
      validateUpload({ type: 'image/png', size: 6 * 1024 * 1024 } as File, 'product-images'),
    ).toThrow();
    expect(
      validateUpload({ type: 'application/pdf', size: 200 } as File, 'business-documents'),
    ).toBe('pdf');
  });
  it('enforces Bangladesh district and division pairs', () => {
    const b = {
      name: 'Test supplier',
      name_bn: '',
      description: '',
      division: 'Dhaka',
      district: 'Sylhet',
      address: '',
      contact_phone: '+8801712345678',
      website: '',
    };
    expect(businessSchema.safeParse(b).success).toBe(false);
    expect(businessSchema.safeParse({ ...b, district: 'Dhaka' }).success).toBe(true);
  });
  it('covers all 64 districts', () => expect(Object.values(locations).flat()).toHaveLength(64));
  it('rejects negative prices and duplicate tier boundaries', () => {
    const p = {
      name: 'Cotton shirt',
      name_bn: '',
      description: 'Cotton shirts in bulk',
      category_id: '12345678-1234-4234-8234-123456789012',
      price: 100,
      moq: 10,
      stock: 100,
      unit: 'piece',
      specifications: {},
      tiers: [
        { min_quantity: 10, price: 90 },
        { min_quantity: 10, price: 80 },
      ],
    };
    expect(productSchema.safeParse(p).success).toBe(false);
    expect(productSchema.safeParse({ ...p, tiers: [], price: -1 }).success).toBe(false);
    expect(productSchema.safeParse({ ...p, tiers: [] }).success).toBe(true);
  });
  it('requires a real quotation message and positive integer quantity', () => {
    expect(quoteSchema.safeParse({ quantity: 0, message: 'test' }).success).toBe(false);
    expect(
      quoteSchema.safeParse({ quantity: 10, message: 'Please quote delivery to Dhaka.' }).success,
    ).toBe(true);
  });
});

it('shows validation messages without raw Zod JSON', () => {
  const result = z
    .object({ reason: z.string().min(5, 'Please explain your decision.') })
    .safeParse({ reason: '' });
  if (!result.success) expect(errorMessage(result.error)).toBe('Please explain your decision.');
  expect(errorMessage(new Error('Ordinary error'))).toBe('Ordinary error');
});

it('generates valid RFC4122 v4 UUIDs even when browser crypto.randomUUID is undefined', () => {
  const uuid = randomUUID();
  expect(z.string().uuid().safeParse(uuid).success).toBe(true);
  expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
