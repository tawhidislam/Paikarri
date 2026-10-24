// Explicit designated-cloud acceptance. Never prints account tokens or response bodies.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const project = process.env.SUPPLIER_API_TEST_PROJECT_REF;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const tokens = [
  process.env.SUPPLIER_API_TEST_SUPPLIER_TOKEN,
  process.env.SUPPLIER_API_TEST_OTHER_SUPPLIER_TOKEN,
  process.env.SUPPLIER_API_TEST_BUYER_TOKEN,
];
if (
  !project ||
  !key ||
  tokens.some((token) => !token) ||
  process.env.ALLOW_SUPPLIER_API_TEST_WRITES !== '1'
)
  throw new Error(
    'Use an explicitly designated cloud test project. Set SUPPLIER_API_TEST_PROJECT_REF, SUPABASE_PUBLISHABLE_KEY, all three SUPPLIER_API_TEST_*_TOKEN variables, and ALLOW_SUPPLIER_API_TEST_WRITES=1.',
  );
if (!/^[a-z0-9]{20}$/.test(project)) throw new Error('Invalid project ref.');
const origin = `https://${project}.supabase.co`,
  base = origin + '/functions/v1/supplier-api/v1';
async function call(token, path, method = 'GET', body, requestKey = randomUUID(), expected = 200) {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(30000),
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(method !== 'GET'
        ? { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey }
        : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.ok(
    (Array.isArray(expected) ? expected : [expected]).includes(response.status),
    `${method} ${path}: expected ${expected}, received ${response.status}; code=${result.error?.code ?? 'none'}; request_id=${response.headers.get('x-request-id')}`,
  );
  if (response.ok) assert.equal(result.meta.request_id, response.headers.get('x-request-id'));
  return Array.isArray(expected) ? { status: response.status, data: result.data } : result.data;
}
const [supplier, other, buyer] = tokens;
await call(null, '/overview', 'GET', undefined, undefined, 401);
await call('invalid', '/overview', 'GET', undefined, undefined, 401);
await call(buyer, '/products', 'GET', undefined, undefined, 403);
assert.equal((await call(supplier, '/me')).role, 'supplier');
assert.equal((await call(other, '/me')).role, 'supplier');
const business = await call(supplier, '/business');
assert.ok(business, 'The designated supplier must have a business profile.');
const reference = await call(supplier, '/reference');
assert.ok(reference.categories.length, 'Seed reference categories before acceptance.');
for (const path of [
  '/overview',
  '/performance',
  '/profile',
  '/business/shipping',
  '/products',
  '/quotations',
  '/requests',
  '/orders',
  '/conversations',
  '/verification',
  '/actions',
  '/reviews',
  '/tenders',
  '/notifications',
  '/notifications/unread',
  '/products/imports/template',
  '/products/imports/categories',
])
  await call(supplier, path);
console.log('Live identity, access denial and dashboard listing checks passed.');
const nonce = randomUUID();
let product;
try {
  const body = {
    name: 'Synthetic mobile API ' + nonce,
    name_bn: '',
    description: 'Isolated mobile API acceptance fixture. Not a real offer.',
    category_id: reference.categories[0].id,
    price: 100,
    moq: 1,
    stock: 50,
    unit: 'piece',
    specifications: {},
    tiers: [],
  };
  const concurrentCreates = await Promise.all([
    call(supplier, '/products', 'POST', body, nonce, 201),
    call(supplier, '/products', 'POST', body, nonce, 201),
  ]);
  product = concurrentCreates[0];
  assert.deepEqual(concurrentCreates[1], product, 'Concurrent retries create one product');
  assert.deepEqual(
    await call(supplier, '/products', 'POST', body, nonce, 201),
    product,
    'Product retry must return the original response',
  );
  await call(supplier, '/products', 'POST', { ...body, name: 'Different retry input' }, nonce, 409);
  await call(other, `/products/${product.id}`, 'GET', undefined, undefined, 404);
  await call(
    supplier,
    `/products/${product.id}`,
    'PATCH',
    {
      expected_updated_at: '2000-01-01T00:00:00Z',
      values: Object.fromEntries(Object.entries(body).filter(([name]) => name !== 'stock')),
    },
    randomUUID(),
    409,
  );
  const options = await call(supplier, `/products/${product.id}/options`);
  const sku = options.skus[0],
    inventoryKey = randomUUID();
  const inventory = await call(
    supplier,
    `/products/${product.id}/skus/${sku.id}/inventory`,
    'PUT',
    { expected_version: sku.version, quantity: 45 },
    inventoryKey,
  );
  assert.deepEqual(
    await call(
      supplier,
      `/products/${product.id}/skus/${sku.id}/inventory`,
      'PUT',
      { expected_version: sku.version, quantity: 45 },
      inventoryKey,
    ),
    inventory,
  );
  await call(
    supplier,
    `/products/${product.id}/skus/${sku.id}/inventory`,
    'PUT',
    { expected_version: sku.version, quantity: 999 },
    randomUUID(),
    409,
  );
  const currentSku = inventory.skus.find((entry) => entry.id === sku.id);
  const competingWrites = await Promise.all(
    [43, 44].map((quantity) =>
      call(
        supplier,
        `/products/${product.id}/skus/${sku.id}/inventory`,
        'PUT',
        { expected_version: currentSku.version, quantity },
        randomUUID(),
        [200, 409],
      ),
    ),
  );
  assert.deepEqual(
    competingWrites.map((result) => result.status).sort(),
    [200, 409],
    'Exactly one simultaneous inventory decision may commit',
  );
  console.log('Live product retries, stale conflicts and concurrent inventory checks passed.');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
    'base64',
  );
  const ticket = await call(
    supplier,
    '/uploads',
    'POST',
    { purpose: 'product', parent_id: product.id, mime: 'image/png', size: png.length },
    randomUUID(),
    201,
  );
  try {
    await call(supplier, `/uploads/${ticket.id}/complete`, 'POST', {}, randomUUID(), 422);
    const storage = createClient(origin, key, {
      global: { headers: { Authorization: 'Bearer ' + supplier } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await storage.storage
      .from(ticket.bucket)
      .uploadToSignedUrl(ticket.path, ticket.upload_token, png, { contentType: 'image/png' });
    assert.ifError(error);
    const otherStorage = createClient(origin, key, {
      global: { headers: { Authorization: 'Bearer ' + other } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.ok((await otherStorage.storage.from(ticket.bucket).download(ticket.path)).error);
    await storage.storage.from(ticket.bucket).remove([ticket.path]);
    assert.ifError((await storage.storage.from(ticket.bucket).download(ticket.path)).error);
    await call(supplier, `/uploads/${ticket.id}/complete`, 'POST', {});
    const updated = await call(supplier, `/products/${product.id}`);
    assert.equal(updated.images.length, 1);
    await call(other, `/uploads/product/${updated.images[0].id}`, 'GET', undefined, undefined, 404);
    await call(supplier, `/uploads/product/${updated.images[0].id}`);
  } finally {
    await call(supplier, `/uploads/${ticket.id}`, 'DELETE', {});
  }
  const csv = [
    [
      'name',
      'name_bn',
      'description',
      'category_slug',
      'price',
      'moq',
      'stock',
      'unit',
      'specifications',
      'tiers',
    ].join(','),
    [
      'Synthetic import',
      '',
      'Synthetic import preview only',
      reference.categories[0].slug,
      100,
      1,
      10,
      'piece',
      '{}',
      '[]',
    ].join(','),
  ].join('\n');
  const validated = await call(supplier, '/products/imports/validate', 'POST', { csv });
  assert.equal(validated.rows[0].error, null);
  console.log(
    'Supplier API acceptance passed: identity, isolation, listings, concurrent creation/inventory, replay, conflicts, real private Storage and CSV validation.',
  );
} finally {
  if (product) {
    const current = await call(supplier, `/products/${product.id}`);
    await call(supplier, `/products/${product.id}`, 'DELETE', {
      expected_updated_at: current.updated_at,
    });
  }
}
