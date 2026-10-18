import { deploymentConfig } from '../server/deployment.mjs';
import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const { site, indexable } = deploymentConfig(env);
const urls = [
  '/',
  '/products',
  '/suppliers',
  '/tenders',
  '/info/privacy',
  '/info/support',
  '/info/about',
  '/info/trust',
  '/info/terms',
  '/info/refund',
];
if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  for (const [rpc, prefix] of [
    ['public_products', '/products'],
    ['public_businesses', '/suppliers'],
  ]) {
    for (let start = 0; ; start += 1000) {
      const { data, error } = await c
        .rpc(rpc)
        .select('id')
        .order('id')
        .range(start, start + 999);
      if (error)
        throw new Error('Public sitemap query failed. Check Supabase settings and availability.');
      urls.push(...data.map((p) => `${prefix}/${p.id}`));
      if (data.length < 1000) break;
    }
  }
}
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
writeFileSync(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((p) => `<url><loc>${escape(site + p)}</loc></url>`).join('')}</urlset>`,
);
writeFileSync(
  'public/robots.txt',
  `User-agent: *\n${!indexable ? 'Disallow: /' : 'Allow: /\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /cart\nDisallow: /checkout\nDisallow: /auth'}\nSitemap: ${site}/sitemap.xml\n`,
);
console.log(`Generated sitemap with ${urls.length} public URLs.`);
