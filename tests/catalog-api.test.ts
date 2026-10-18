import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
vi.mock('node:fs/promises', () => ({
  readFile: vi
    .fn()
    .mockResolvedValue(
      '<html><head><title>Site</title></head><body><div id="root"></div></body></html>',
    ),
}));
import { readFile } from 'node:fs/promises';
import handler from '../api/catalog';
function response() {
  const headers: Record<string, string> = {};
  let body: unknown;
  const res = {
    statusCode: 200,
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    end: (value: unknown) => {
      body = value;
    },
  };
  return { res: res as unknown as ServerResponse, headers, body: () => body };
}
describe('Vercel public catalog handler', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-key');
    vi.stubEnv('VITE_SITE_URL', 'https://market.example');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json([
            {
              id: '11111111-1111-4111-8111-111111111111',
              name: 'Synthetic listing',
              price: 100,
              moq: 10,
              unit: 'piece',
              stock: 100,
            },
          ]),
        ),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.mocked(readFile).mockClear();
  });
  it('renders a rewritten product with no caching and no preview indexing', async () => {
    const result = response();
    await handler(
      {
        method: 'GET',
        url: '/api/catalog?path=/products/11111111-1111-4111-8111-111111111111',
      } as IncomingMessage,
      result.res,
    );
    expect(result.res.statusCode).toBe(200);
    expect(result.headers['Cache-Control']).toContain('no-store');
    expect(result.headers['X-Robots-Tag']).toContain('noindex');
    expect(result.body()).toContain('Synthetic listing');
    expect(readFile).toHaveBeenCalledWith(expect.stringContaining('dist/index.html'), 'utf8');
  });
  it('returns HEAD without an HTML body', async () => {
    const result = response();
    await handler(
      {
        method: 'HEAD',
        url: '/api/catalog?path=/suppliers/11111111-1111-4111-8111-111111111111',
      } as IncomingMessage,
      result.res,
    );
    expect(result.res.statusCode).toBe(200);
    expect(result.body()).toBeUndefined();
  });
  it('rejects writes before reading data', async () => {
    const result = response();
    await handler({ method: 'POST', url: '/api/catalog' } as IncomingMessage, result.res);
    expect(result.res.statusCode).toBe(405);
    expect(result.headers.Allow).toBe('GET, HEAD');
    expect(readFile).not.toHaveBeenCalled();
  });
  it('handles missing bundled templates without exposing server internals', async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error('private file location'));
    const result = response();
    await handler({ method: 'GET', url: '/api/catalog' } as IncomingMessage, result.res);
    expect(result.res.statusCode).toBe(503);
    expect(result.body()).not.toContain('private file location');
  });
});
