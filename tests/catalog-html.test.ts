import { describe, expect, it, vi } from 'vitest';
import { catalogHtml } from '../server/catalog-html';
const template =
  '<html><head><title>Site</title><meta name="description" content="old"/></head><body><div id="root"></div></body></html>';
const env = {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'public-key',
  VITE_SITE_URL: 'https://example.com',
};
const path = '/products/11111111-1111-4111-8111-111111111111';
describe('public catalog HTML', () => {
  it('renders public records without executing stored HTML or JSON-LD injection', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json([
          {
            id: path.split('/').pop(),
            name: '<img src=x onerror=alert(1)>',
            description: '</script><script>alert(1)</script>',
            price: 120,
            moq: 10,
            unit: 'piece',
            stock: 5,
          },
        ]),
      );
    const result = await catalogHtml(template, path, env, fetcher);
    expect(result.status).toBe(200);
    expect(result.html).toContain('&lt;img');
    expect(result.html).not.toContain('</script><script>alert');
    expect(result.html).toContain('application/ld+json');
    expect(fetcher.mock.calls[0][0]).toContain('public_products?id=eq.');
    expect(fetcher.mock.calls[0][1].headers.apikey).toBe('public-key');
  });
  it('does not resurrect hidden products or cache them', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json([]));
    const result = await catalogHtml(template, path, env, fetcher);
    expect(result.status).toBe(404);
    expect(result.html).toContain('noindex');
    expect(result.html).not.toContain('application/ld+json');
    expect(fetcher.mock.calls[0][1].cache).toBe('no-store');
  });
  it('distinguishes unavailable backend from a missing listing', async () => {
    expect(
      (
        await catalogHtml(
          template,
          path,
          env,
          vi.fn().mockResolvedValue(new Response('', { status: 500 })),
        )
      ).status,
    ).toBe(503);
  });
});
