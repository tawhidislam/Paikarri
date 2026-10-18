import { describe, it, expect } from 'vitest';
import { defaultHomepage, homepageSchema, localLinkSchema } from '../src/lib/operations-schema';
describe('homepage publication input boundaries', () => {
  it('accepts the original bilingual homepage and safe marketplace links', () => {
    expect(homepageSchema.safeParse(defaultHomepage).success).toBe(true);
    expect(localLinkSchema.safeParse('/products?category=apparel-textiles').success).toBe(true);
  });
  it('rejects external, protocol-relative and backslash links', () => {
    for (const hero_href of [
      'https://evil.invalid',
      '//evil.invalid',
      '/\\evil.invalid',
      'javascript:alert(1)',
      '/products\n',
    ])
      expect(homepageSchema.safeParse({ ...defaultHomepage, hero_href }).success).toBe(false);
  });
  it('requires both announcement languages and image alternative text', () => {
    expect(
      homepageSchema.safeParse({
        ...defaultHomepage,
        show_announcement: true,
        announcement_en: 'News',
      }).success,
    ).toBe(false);
    expect(
      homepageSchema.safeParse({
        ...defaultHomepage,
        hero_image: 'owner/banner.jpg',
        hero_alt_bn: '',
      }).success,
    ).toBe(false);
  });
  it('rejects duplicate, oversized and invalid featured selections', () => {
    const id = 'b1000000-0000-4000-8000-000000000001';
    expect(homepageSchema.safeParse({ ...defaultHomepage, product_ids: [id, id] }).success).toBe(
      false,
    );
    expect(
      homepageSchema.safeParse({ ...defaultHomepage, supplier_ids: ['invalid'] }).success,
    ).toBe(false);
    expect(
      homepageSchema.safeParse({ ...defaultHomepage, supplier_ids: [id, id, id, id] }).success,
    ).toBe(false);
  });
});
