// Read-only launch check. Uses the same RLS-safe public projections as browsing.
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY)
  throw new Error(
    'Configure the hosted Supabase URL and publishable key before checking the catalog.',
  );
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function publicRows(rpc, fields) {
  const rows = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await client
      .rpc(rpc)
      .select(fields)
      .order('id')
      .range(start, start + 499);
    if (error) throw new Error(`Public catalog check failed for ${rpc}: ${error.message}`);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
const [products, businesses] = await Promise.all([
  publicRows('public_products', 'id,name,specifications'),
  publicRows('public_businesses', 'id,name'),
]);
const demoProducts = products.filter(
  (p) => /^\[DEMO\]/i.test(p.name) || p.specifications?.Dataset === 'paikari-demo-20261017',
);
const testBusinesses = businesses.filter((b) => /^\[TEST\]/i.test(b.name));
console.log(`Public catalog: ${products.length} listings, ${businesses.length} suppliers.`);
if (demoProducts.length || testBusinesses.length) {
  console.error(
    `Launch check blocked: ${demoProducts.length} demo listings and ${testBusinesses.length} test suppliers remain public.`,
  );
  console.error(
    'Archive demo listings and suspend designated test supplier accounts through existing admin controls before a real launch. Preserve their order and conversation history.',
  );
  process.exitCode = 1;
} else if (!products.length || !businesses.length) {
  console.error('Launch check blocked: the public catalog has no available products or suppliers.');
  process.exitCode = 1;
} else {
  console.log(
    'No explicitly marked demo listings or test suppliers found. Product-photo authenticity still requires human review.',
  );
}
