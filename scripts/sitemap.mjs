import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const site = (
  env.VITE_SITE_URL || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'http://localhost:5173')
).replace(/\/$/, '');
const urls = ['/', '/products', '/suppliers', '/info/about', '/info/trust'];
if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  for (let start = 0; ; start += 1000) {
    const { data, error } = await c
      .from('products')
      .select('id')
      .eq('status', 'approved')
      .order('id')
      .range(start, start + 999);
    if (error) throw new Error('Sitemap catalog query failed: ' + error.message);
    urls.push(...data.map((p) => `/products/${p.id}`));
    if (data.length < 1000) break;
  }
}
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
writeFileSync(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((p) => `<url><loc>${escape(site + p)}</loc></url>`).join('')}</urlset>`,
);
writeFileSync(
  'public/robots.txt',
  `User-agent: *\n${site.includes('localhost') ? 'Disallow: /' : 'Allow: /\nDisallow: /dashboard\nDisallow: /auth'}\nSitemap: ${site}/sitemap.xml\n`,
);
console.log(`Generated sitemap with ${urls.length} public URLs.`);
