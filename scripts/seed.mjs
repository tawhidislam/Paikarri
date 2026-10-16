// Optional fictional fixtures. Never run automatically or on a production project.
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env };
if (env.ALLOW_FICTIONAL_SEED !== '1')
  throw new Error('Set ALLOW_FICTIONAL_SEED=1 only for a non-production cloud project.');
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SECRET_KEY)
  throw new Error('Set VITE_SUPABASE_URL and operator-only SUPABASE_SECRET_KEY.');
const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: cats, error: catError } = await client.from('categories').select('id,slug');
if (catError) throw catError;
const fixtures = [
  {
    name: '[Fictional] Padma Textile Works',
    district: 'Narayanganj',
    division: 'Dhaka',
    category: 'apparel-textiles',
    products: [
      ['Cotton crew-neck T-shirt', 'কটন টি-শার্ট', 185, 100, 'piece'],
      ['Cotton polo shirt', 'কটন পোলো শার্ট', 290, 60, 'piece'],
    ],
  },
  {
    name: '[Fictional] Meghna Jute Collective',
    district: 'Khulna',
    division: 'Khulna',
    category: 'jute-handicrafts',
    products: [
      ['Reusable natural jute tote', 'পাটের ব্যাগ', 120, 200, 'piece'],
      ['Handwoven jute storage basket', 'পাটের ঝুড়ি', 340, 50, 'piece'],
    ],
  },
];
const accounts = [];
for (let i = 0; i < fixtures.length; i++) {
  const f = fixtures[i];
  const email = `seed-${Date.now()}-${i}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  const { data: u, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: f.name },
  });
  if (error) throw error;
  const uid = u.user.id;
  accounts.push({ email, password });
  const role = await client.from('user_roles').update({ role: 'supplier' }).eq('user_id', uid);
  if (role.error) throw role.error;
  const b = await client
    .from('businesses')
    .insert({
      owner_id: uid,
      name: f.name,
      division: f.division,
      district: f.district,
      description:
        'FICTIONAL EXAMPLE ONLY. This business is seed data for development, not a real supplier.',
    })
    .select('id')
    .single();
  if (b.error) throw b.error;
  for (const [name, name_bn, price, moq, unit] of f.products) {
    const p = await client
      .from('products')
      .insert({
        business_id: b.data.id,
        category_id: cats.find((c) => c.slug === f.category).id,
        name,
        name_bn,
        price,
        moq,
        unit,
        stock: 5000,
        status: 'pending',
        description:
          'FICTIONAL EXAMPLE PRODUCT for development and testing. Do not treat this as a commercial offer.',
        specifications: {
          Material: f.category === 'apparel-textiles' ? 'Cotton' : 'Jute',
          Origin: 'Bangladesh',
          Dataset: 'Fictional development fixture',
        },
      })
      .select('id')
      .single();
    if (p.error) throw p.error;
    const t = await client.from('product_price_tiers').insert([
      { product_id: p.data.id, min_quantity: Number(moq), price: Number(price) },
      { product_id: p.data.id, min_quantity: Number(moq) * 5, price: Number(price) * 0.9 },
    ]);
    if (t.error) throw t.error;
  }
}
writeFileSync('.env.seed-accounts', JSON.stringify(accounts, null, 2), { mode: 0o600 });
console.log(
  'Fictional businesses and pending products created. Login details are in gitignored .env.seed-accounts. Nothing was approved or verified.',
);
