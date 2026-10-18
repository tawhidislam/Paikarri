// Explicit, repeatable development fixtures for the two user-requested test suppliers.
// Uses public SDK credentials and each supplier's own session; never grants verification.
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
if (process.env.ALLOW_DEMO_PRODUCTS !== '1')
  throw new Error('Set ALLOW_DEMO_PRODUCTS=1 for the user-authorized development cloud project.');
const env = loadEnv('development', process.cwd(), '');
const accounts = JSON.parse(readFileSync('.env.demo-suppliers', 'utf8'));
if (
  accounts.length !== 2 ||
  accounts.some((a) => !/^test\.supplier2?@paikari\.example$/.test(a.email))
)
  throw new Error('Only the two designated fictional supplier accounts are allowed.');
const dataset = 'paikari-demo-20261017';
const banglaNames = [
  ['কটন গোল গলা টি-শার্ট', 'কটন পোলো শার্ট', 'কটন সোয়েটশার্ট'],
  ['কাঠের সাইড টেবিল', 'কাপড়ের ডাইনিং চেয়ার', 'মডুলার স্টোরেজ তাক'],
];
const fixtures = [
  {
    name: '[TEST] Paikari Demo Supplier',
    category: 'apparel-textiles',
    district: 'Narayanganj',
    division: 'Dhaka',
    image: 'photo-1489987707025-afc232f7ea0f-640.webp',
    products: [
      ['Cotton crew-neck T-shirt', 185, 100, 5000, 'Cotton jersey'],
      ['Cotton polo shirt', 290, 60, 3000, 'Cotton pique'],
      ['Cotton sweatshirt', 490, 30, 1200, 'Cotton fleece'],
    ],
  },
  {
    name: '[TEST] Paikari Homeware Supplier',
    category: 'home-living',
    district: 'Chattogram',
    division: 'Chattogram',
    image: 'photo-1600210492486-724fe5c67fb0-640.webp',
    products: [
      ['Wooden side table', 1450, 10, 180, 'Engineered wood'],
      ['Fabric dining chair', 1950, 8, 120, 'Fabric and wood'],
      ['Modular storage shelf', 2450, 6, 80, 'Engineered wood'],
    ],
  },
];
const result = [];
for (let i = 0; i < accounts.length; i++) {
  const account = accounts[i],
    fixture = fixtures[i];
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (authError || auth.user.id !== account.user_id)
    throw new Error(`Test supplier ${i + 1} sign-in failed`);
  const check = (r) => {
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };
  const role = check(
    await client.from('user_roles').select('role').eq('user_id', account.user_id).single(),
  );
  if (role.role === 'buyer') check(await client.rpc('register_supplier'));
  else if (role.role !== 'supplier')
    throw new Error('Refusing to alter a non-supplier privileged account');
  let business = check(
    await client
      .from('businesses')
      .select('id,name,verified')
      .eq('owner_id', account.user_id)
      .maybeSingle(),
  );
  if (!business) {
    check(
      await client.from('businesses').insert({
        id: account.business_id,
        owner_id: account.user_id,
        name: fixture.name,
        division: fixture.division,
        district: fixture.district,
        address: 'DEMO ONLY - fictional testing business location',
        description:
          'FICTIONAL TEST SUPPLIER. Development demonstration account only; no real commercial offers. Product photographs are illustrative category images.',
      }),
    );
    business = check(
      await client
        .from('businesses')
        .select('id,name,verified')
        .eq('owner_id', account.user_id)
        .single(),
    );
  }
  if (business.id !== account.business_id || !business.name.startsWith('[TEST]'))
    throw new Error('Refusing to seed an unrelated business');
  const category = check(
    await client.from('categories').select('id').eq('slug', fixture.category).single(),
  );
  for (let n = 0; n < fixture.products.length; n++) {
    const [name, price, moq, stock, material] = fixture.products[n],
      sku = `${dataset}-${i + 1}-${n + 1}`;
    let product = check(
      await client
        .from('products')
        .select('id,status')
        .eq('business_id', business.id)
        .contains('specifications', { 'Demo SKU': sku })
        .maybeSingle(),
    );
    if (!product) {
      const id = check(
        await client.rpc('save_product', {
          payload: {
            name: `[DEMO] ${name}`,
            name_bn: `[DEMO] ${banglaNames[i][n]}`,
            description:
              'FICTIONAL DEMO PRODUCT - for testing Paikarii.com only. This is not a real commercial offer. Photos illustrate the product category and do not depict an actual item for sale. Use this listing to test search, minimum quantities, tiered pricing, favorites, inquiries, and moderation.',
            category_id: category.id,
            price,
            moq,
            stock,
            unit: 'piece',
            specifications: {
              Material: material,
              Origin: 'Bangladesh',
              Dataset: dataset,
              'Demo SKU': sku,
              'Image purpose': 'Illustrative category photograph; not an actual product',
            },
            tiers: [
              { min_quantity: moq, price },
              { min_quantity: moq * 3, price: Math.round(price * 0.95) },
              { min_quantity: moq * 10, price: Math.round(price * 0.9) },
            ],
          },
        }),
      );
      product = { id, status: 'pending' };
    }
    const images = check(
      await client.from('product_images').select('id,path').eq('product_id', product.id),
    );
    if (!images.length) {
      const path = `${account.user_id}/${product.id}/${randomUUID()}.webp`;
      check(
        await client.storage
          .from('product-images')
          .upload(path, readFileSync(`public/images/${fixture.image}`), {
            contentType: 'image/webp',
            upsert: false,
          }),
      );
      const attached = await client
        .from('product_images')
        .insert({ product_id: product.id, path, position: 0 });
      if (attached.error) {
        await client.storage.from('product-images').remove([path]);
        throw new Error(attached.error.message);
      }
    }
    result.push({
      id: product.id,
      business_id: business.id,
      name: `[DEMO] ${name}`,
      target_status: n < 2 ? 'approved' : 'pending',
    });
  }
  await client.auth.signOut();
  console.log(`Supplier ${i + 1}: profile ready, three demo products with images and price tiers.`);
}
writeFileSync('.env.demo-products', JSON.stringify(result, null, 2), { mode: 0o600 });
chmodSync('.env.demo-products', 0o600);
console.log(
  'Demo products saved through supplier-authorized APIs. Approval is a separate audited step.',
);
