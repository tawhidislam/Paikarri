import { describe, it, expect } from 'vitest';
import { deploymentConfig } from '../server/deployment.mjs';
const cloud = {
  VERCEL: '1',
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_fixture',
};
describe('deployment environment', () => {
  it('keeps local builds unindexed and requires cloud settings on Vercel', () => {
    expect(deploymentConfig({})).toEqual({ site: 'http://localhost:5173', indexable: false });
    expect(() => deploymentConfig({ VERCEL: '1', VERCEL_URL: 'test.vercel.app' })).toThrow(
      'Set VITE_SUPABASE_URL',
    );
  });
  it('uses the stable production domain and an isolated preview origin', () => {
    expect(
      deploymentConfig({
        ...cloud,
        VERCEL_ENV: 'production',
        VERCEL_PROJECT_PRODUCTION_URL: 'market.example',
        VERCEL_URL: 'build.vercel.app',
      }),
    ).toEqual({ site: 'https://market.example', indexable: true });
    expect(
      deploymentConfig({
        ...cloud,
        VERCEL_ENV: 'preview',
        VERCEL_PROJECT_PRODUCTION_URL: 'market.example',
        VERCEL_URL: 'preview.vercel.app',
      }),
    ).toEqual({ site: 'https://preview.vercel.app', indexable: false });
  });
  it('accepts an explicit canonical HTTPS origin', () => {
    expect(
      deploymentConfig({
        ...cloud,
        VERCEL_ENV: 'production',
        VITE_SITE_URL: 'https://custom.example/',
      }).site,
    ).toBe('https://custom.example');
  });
  it.each([
    'http://localhost:5173',
    'https://market.example/path',
    'https://market.example?q=1',
    'https://name:pass@market.example',
    'javascript:alert(1)',
  ])('rejects unsafe cloud origins: %s', (site) => {
    expect(() => deploymentConfig({ ...cloud, VITE_SITE_URL: site })).toThrow();
  });
  it('rejects secret keys without including their values in errors', () => {
    const secret = 'sb_secret_synthetic_never_publish';
    let message = '';
    try {
      deploymentConfig({ ...cloud, VITE_SUPABASE_PUBLISHABLE_KEY: secret });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('never a secret');
    expect(message).not.toContain(secret);
    const token =
      'e30.' +
      Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') +
      '.synthetic';
    expect(() => deploymentConfig({ ...cloud, VITE_SUPABASE_PUBLISHABLE_KEY: token })).toThrow(
      'never a secret',
    );
    expect(() => deploymentConfig({ VITE_SUPABASE_SECRET_KEY: secret })).toThrow(
      'server credentials',
    );
  });
});

describe('Vercel SPA routing', () => {
  it('keeps assets and API requests out of the SPA fallback while supporting deep links', async () => {
    const { readFile } = await import('node:fs/promises');
    const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
    const csp = config.headers[0].headers.find(
      (h: { key: string }) => h.key === 'Content-Security-Policy',
    ).value;
    expect(csp).toContain("frame-src 'self' https://*.supabase.co");
    const fallback = new RegExp('^' + config.rewrites.at(-1).source + '$');
    for (const path of [
      '/assets/app.js',
      '/images/photo.webp',
      '/api/catalog',
      '/robots.txt',
      '/sitemap.xml',
    ])
      expect(fallback.test(path)).toBe(false);
    for (const path of [
      '/',
      '/dashboard/messages',
      '/admin/verifications/123',
      '/auth/callback',
      '/cart',
      '/checkout',
    ])
      expect(fallback.test(path)).toBe(true);
  });
});
