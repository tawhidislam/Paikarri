import { describe, it, expect, vi } from 'vitest';
import {
  createSupplierApi,
  ApiError,
  mapError,
  type Backend,
  type ObjectData,
} from '../supabase/functions/_shared/supplier-api/handler';
import { routes } from '../supabase/functions/_shared/supplier-api/routes';
import {
  productInput,
  productUpdate,
  businessInput,
  uploadInput,
  orderActionInput,
  stepInput,
} from '../supabase/functions/_shared/supplier-api/inputs';
import { inspectUpload } from '../supabase/functions/_shared/supplier-api/upload-validation';
import { SupplierApiClient, SupplierApiError, endpoints } from '../src/mobile/supplier-client';
const uid = '10000000-0000-4000-8000-000000000001',
  bid = '20000000-0000-4000-8000-000000000001',
  pid = '30000000-0000-4000-8000-000000000001';
const product = {
  id: pid,
  business_id: bid,
  category_id: bid,
  name: 'Cotton shirts',
  name_bn: '',
  description: 'Cotton shirts available wholesale',
  price: 100,
  moq: 10,
  stock: 50,
  unit: 'piece',
  specifications: {},
  status: 'pending',
  updated_at: '2026-10-24T00:00:00Z',
  tiers: [],
};
const productBody = {
  name: product.name,
  name_bn: '',
  description: product.description,
  category_id: bid,
  price: 100,
  moq: 10,
  stock: 50,
  unit: 'piece',
  specifications: {},
  tiers: [],
};
const ticket = {
  id: pid,
  purpose: 'product',
  parent_id: pid,
  slot: null,
  bucket: 'product-images',
  path: `${uid}/${pid}/${bid}.png`,
  mime: 'image/png',
  size: 40,
  width: null,
  height: null,
  verified: false,
  attached: false,
  discarded: false,
  previous_path: null,
  created_at: '2026-10-24T00:00:00Z',
  expires_at: '2099-01-01T00:00:00Z',
};
function fixture(role = 'supplier') {
  const log = vi.fn();
  const backend: Backend = {
    userId: uid,
    rpc: vi.fn(async (name: string, args?: ObjectData): Promise<unknown> => {
      if (name === 'supplier_api_read')
        return args?.operation === 'product' ? product : { rows: [], total: 0 };
      if (name === 'supplier_api_command') {
        if (args?.operation === 'product_create') return product;
        if (args?.operation === 'onboarding') return { role: 'supplier' };
        if (args?.operation === 'upload_prepare') return ticket;
        if (args?.operation === 'upload_complete')
          return { upload: { ...ticket, verified: true, attached: true }, verification: null };
        return { updated: true };
      }
      if (name === 'notification_unread_count') return 2;
      if (name === 'supplier_api_upload_info') return ticket;
      if (name === 'chat_messages')
        return { rows: [], has_more: false, oldest: null, newest: null };
      if (name === 'get_account_status') return { status: 'active' };
      if (name === 'get_platform_settings') return { supplier_registration_open: true };
      return { rows: [], total: 0 };
    }),
    one: vi.fn(async (table: string) => (table === 'user_roles' ? { role } : null)),
    rows: vi.fn(async () => []),
    signUpload: vi.fn(async () => ({
      upload_url: 'https://example.invalid/upload',
      upload_token: 'synthetic',
      upload_method: 'PUT',
    })),
    verifyUpload: vi.fn(async () => {}),
    removeFile: vi.fn(async () => {}),
    signRead: vi.fn(async () => ({
      url: 'https://example.invalid/read',
      expires_at: '2099-01-01T00:00:00Z',
    })),
  };
  const authenticate = vi.fn(async () => backend);
  const handle = createSupplierApi({ authenticate, log });
  const request = (
    path: string,
    method = 'GET',
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    handle(
      new Request('https://example.invalid/functions/v1/supplier-api/v1' + path, {
        method,
        headers: {
          authorization: 'Bearer synthetic',
          'Content-Type': 'application/json',
          ...(method !== 'GET' ? { 'Idempotency-Key': 'synthetic-key-001' } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
    );
  return { backend, request, handle, log, authenticate };
}
describe('supplier REST boundary', () => {
  it('routes requests after the Cloud gateway strips its prefix', async () => {
    const f = fixture();
    const result = await f.handle(
      new Request('https://example.invalid/supplier-api/v1/notifications/unread', {
        headers: { Authorization: 'Bearer synthetic' },
      }),
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ data: 2 });
    expect(
      (await f.handle(new Request('https://example.invalid/supplier-api/v2/products'))).status,
    ).toBe(404);
  });
  it('rejects missing credentials before resolving roles', async () => {
    const f = fixture();
    const result = await f.handle(
      new Request('https://example.invalid/functions/v1/supplier-api/v1/overview'),
    );
    expect(result.status).toBe(401);
    expect(f.authenticate).not.toHaveBeenCalled();
  });
  it('handles expired credentials', async () => {
    const f = fixture();
    f.authenticate.mockRejectedValueOnce(new ApiError(401, 'UNAUTHENTICATED', 'Session expired'));
    expect((await f.request('/overview')).status).toBe(401);
  });
  for (const role of ['buyer', 'admin', 'super_admin'])
    it(`denies ${role} access to supplier data`, async () => {
      const f = fixture(role);
      expect((await f.request('/overview')).status).toBe(403);
      expect(f.backend.rpc).not.toHaveBeenCalled();
    });
  it('permits buyer identity and explicit onboarding only', async () => {
    const f = fixture('buyer');
    expect((await f.request('/me')).status).toBe(200);
    expect((await f.request('/onboarding', 'POST', {})).status).toBe(200);
    expect(f.backend.rpc).toHaveBeenCalledWith(
      'supplier_api_command',
      expect.objectContaining({ operation: 'onboarding' }),
    );
  });
  it('does not blanket-block suspended supplier follow-up', async () => {
    const f = fixture();
    expect((await f.request('/notifications/unread')).status).toBe(200);
    expect(f.backend.rpc).toHaveBeenCalledWith('notification_unread_count', undefined);
  });
  it('supports preflight and version boundaries', async () => {
    const f = fixture();
    const response = await f.handle(new Request('https://example.invalid', { method: 'OPTIONS' }));
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-headers')).toContain('idempotency-key');
    expect(
      (await f.handle(new Request('https://example.invalid/functions/v1/supplier-api/v2/products')))
        .status,
    ).toBe(404);
  });
  it('requires stable keys and rejects unknown protected fields', async () => {
    const f = fixture();
    expect(
      (await f.request('/products', 'POST', productBody, { 'Idempotency-Key': '' })).status,
    ).toBe(422);
    expect(
      (await f.request('/products', 'POST', { ...productBody, business_id: uid })).status,
    ).toBe(422);
    expect(f.backend.rpc).not.toHaveBeenCalled();
  });
  it('scopes creation to the caller and returns a documented envelope', async () => {
    const f = fixture();
    const response = await f.request('/products', 'POST', productBody);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.id).toBe(pid);
    expect(data.meta.request_id).toBe(response.headers.get('x-request-id'));
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(f.backend.rpc).toHaveBeenCalledWith('supplier_api_command', {
      operation: 'product_create',
      target: null,
      payload: productBody,
      idempotency_key: 'synthetic-key-001',
    });
  });
  it('uses fixed pages without relying on the PostgREST row cap', async () => {
    const f = fixture();
    vi.mocked(f.backend.rpc).mockResolvedValueOnce({ total: 1026, rows: [product] });
    const response = await f.request('/products?page=42');
    expect(response.status).toBe(200);
    expect((await response.json()).meta).toMatchObject({
      page: 42,
      page_size: 25,
      total: 1026,
      has_more: false,
    });
    expect(f.backend.rpc).toHaveBeenCalledWith('supplier_api_read', {
      operation: 'products',
      target: null,
      filters: { page: 42, search: '', state: '' },
    });
  });
  it('rejects invalid pagination, IDs and unsupported filters', async () => {
    const f = fixture();
    for (const path of [
      '/products?page=0',
      '/products/not-a-uuid',
      '/products?page_size=1000',
      '/reviews?search=ignored',
    ])
      expect((await f.request(path)).status).toBe(422);
    expect(f.backend.rpc).not.toHaveBeenCalled();
  });
  it('checks product ownership before loading publicly readable options', async () => {
    const f = fixture();
    vi.mocked(f.backend.rpc).mockRejectedValueOnce({ code: 'P0002' });
    expect((await f.request(`/products/${pid}/options`)).status).toBe(404);
    expect(f.backend.rpc).toHaveBeenCalledTimes(1);
  });
  it('verifies nested SKU ownership through the transactional command', async () => {
    const f = fixture();
    vi.mocked(f.backend.rpc).mockRejectedValueOnce({ code: 'P0002' });
    expect(
      (
        await f.request(`/products/${pid}/skus/${bid}/inventory`, 'PUT', {
          expected_version: 1,
          quantity: 20,
        })
      ).status,
    ).toBe(404);
    expect(f.backend.rpc).toHaveBeenCalledWith(
      'supplier_api_command',
      expect.objectContaining({
        target: bid,
        payload: { product_id: pid, expected_version: 1, quantity: 20 },
      }),
    );
  });
  it('returns conflicts without logging private request bodies', async () => {
    const f = fixture();
    vi.mocked(f.backend.rpc).mockRejectedValueOnce({
      code: '40001',
      message: 'private identifier 000012345',
    });
    const response = await f.request(`/actions/${pid}/response`, 'POST', {
      expected_version: 1,
      response: 'Sensitive correction content',
    });
    expect(response.status).toBe(409);
    expect(JSON.stringify(await response.json())).not.toContain('000012345');
    expect(JSON.stringify(f.log.mock.calls)).not.toMatch(/Sensitive|000012345|Bearer/);
  });
  it('does not expose database errors', async () => {
    const f = fixture();
    vi.mocked(f.backend.rpc).mockRejectedValueOnce(new Error('secret database connection'));
    const result = await f.request('/overview');
    expect(result.status).toBe(500);
    expect(JSON.stringify(await result.json())).not.toContain('secret');
  });
  it('distinguishes backend shape failures from user validation', async () => {
    const f = fixture();
    vi.mocked(f.backend.rpc).mockResolvedValueOnce({ unexpected: 'shape' });
    expect((await f.request(`/products/${pid}`)).status).toBe(500);
  });
  it('maps rate limits with a retry hint', async () => {
    const f = fixture();
    vi.mocked(f.backend.rpc).mockRejectedValueOnce({
      code: 'P0001',
      message: 'Rate limit exceeded',
    });
    const response = await f.request('/overview');
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
  });
  it('keeps unknown API operations closed', async () => {
    const f = fixture();
    for (const path of ['/admin/notes', '/payments/verify', '/../admin'])
      expect((await f.request(path)).status).toBe(404);
  });
  it('preserves chat cursor directions and validates their shape', async () => {
    const f = fixture();
    const cursor = JSON.stringify({ created_at: '2026-10-24T00:00:00Z', id: pid });
    expect(
      (await f.request(`/conversations/${pid}/messages?after=${encodeURIComponent(cursor)}`))
        .status,
    ).toBe(200);
    expect(f.backend.rpc).toHaveBeenCalledWith('chat_messages', {
      target: pid,
      page_size: 50,
      before_cursor: null,
      after_cursor: JSON.parse(cursor),
    });
    expect((await f.request(`/conversations/${pid}/messages?after=invalid`)).status).toBe(422);
    expect(
      (
        await f.request(
          `/conversations/${pid}/messages?after=${encodeURIComponent(cursor)}&before=${encodeURIComponent(cursor)}`,
        )
      ).status,
    ).toBe(422);
  });
  it('normalizes verification dates without converting leading-zero identifiers', async () => {
    const f = fixture();
    vi.mocked(f.backend.rpc).mockRejectedValueOnce({ code: '40001' });
    await f.request(`/verification/applications/${pid}/steps`, 'PUT', {
      expected_version: 1,
      step: 'identity',
      values: {
        legal_name: 'Synthetic Owner',
        dob: '',
        address: '',
        issuing_country: 'Bangladesh',
        document_type: 'nid',
        document_number: '000012345',
        issued_on: '',
        expires_on: '',
        no_expiry: true,
      },
    });
    expect(f.backend.rpc).toHaveBeenCalledWith(
      'supplier_api_command',
      expect.objectContaining({
        payload: expect.objectContaining({
          values: expect.objectContaining({ dob: null, document_number: '000012345' }),
        }),
      }),
    );
  });
  it('prepares typed direct uploads and only associates after byte verification', async () => {
    const f = fixture();
    const prepared = await f.request('/uploads', 'POST', {
      purpose: 'product',
      parent_id: pid,
      mime: 'image/png',
      size: 40,
    });
    expect(prepared.status).toBe(201);
    expect((await prepared.json()).data).toMatchObject({
      id: pid,
      upload_method: 'PUT',
      upload_token: 'synthetic',
    });
    expect(f.backend.signUpload).toHaveBeenCalledWith(ticket);
    const completed = await f.request(`/uploads/${pid}/complete`, 'POST', {});
    expect(completed.status).toBe(200);
    expect((await completed.json()).data.upload.attached).toBe(true);
    expect(f.backend.verifyUpload).toHaveBeenCalledWith(ticket);
    expect(vi.mocked(f.backend.verifyUpload).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(f.backend.rpc).mock.invocationCallOrder.at(-1)!,
    );
  });
  it('verifies bytes before attaching files and preserves the previous association on failure', async () => {
    const f = fixture();
    vi.mocked(f.backend.verifyUpload).mockRejectedValueOnce(
      new ApiError(422, 'INVALID_FILE', 'Invalid file'),
    );
    expect(
      (await f.request(`/uploads/${pid}/complete`, 'POST', { expected_version: 1 })).status,
    ).toBe(422);
    expect(f.backend.rpc).not.toHaveBeenCalledWith('supplier_api_command', expect.anything());
  });
  it('allows retrying private-byte cleanup after metadata removal', async () => {
    const f = fixture();
    vi.mocked(f.backend.rpc).mockResolvedValue({
      removed: true,
      bucket: 'product-images',
      path: 'synthetic',
    });
    vi.mocked(f.backend.removeFile).mockRejectedValueOnce(
      new ApiError(503, 'CLEANUP_PENDING', 'Retry cleanup'),
    );
    expect((await f.request(`/uploads/${pid}`, 'DELETE', {})).status).toBe(503);
    expect((await f.request(`/uploads/${pid}`, 'DELETE', {})).status).toBe(200);
    expect(f.backend.removeFile).toHaveBeenCalledTimes(2);
  });
  it('returns null for missing business and a server error for failed lookup', async () => {
    const f = fixture();
    expect((await (await f.request('/business')).json()).data).toBeNull();
    vi.mocked(f.backend.one).mockImplementation(async (table) => {
      if (table === 'user_roles') return { role: 'supplier' };
      throw new Error('lookup failed');
    });
    expect((await f.request('/business')).status).toBe(500);
  });
  it('validates CSV with shared rules and no database write', async () => {
    const f = fixture();
    const response = await f.request('/products/imports/validate', 'POST', {
      csv: 'invalid,headers\n1,2',
    });
    expect(response.status).toBe(422);
    expect(f.backend.rpc).not.toHaveBeenCalled();
  });
});
describe('supplier input and asset contracts', () => {
  it('keeps stock out of product editing and rejects duplicate tier thresholds', () => {
    const editable = { ...productBody };
    Reflect.deleteProperty(editable, 'stock');
    expect(
      productUpdate.safeParse({
        expected_updated_at: product.updated_at,
        values: { ...editable, stock: 9999 },
      }).success,
    ).toBe(false);
    expect(
      productInput.safeParse({
        ...productBody,
        tiers: [
          { min_quantity: 10, price: 80 },
          { min_quantity: 10, price: 70 },
        ],
      }).success,
    ).toBe(false);
    expect(productInput.safeParse({ ...productBody, price: 0.001 }).success).toBe(false);
  });
  it('requires consistent Bangladesh locations', () => {
    expect(
      businessInput.safeParse({
        name: 'Synthetic',
        name_bn: '',
        description: '',
        division: 'Dhaka',
        district: 'Sylhet',
        address: '',
        contact_phone: '+8801712345678',
        website: '',
      }).success,
    ).toBe(false);
  });
  it('rejects privileged order actions and incomplete dispatch', () => {
    expect(
      orderActionInput.safeParse({
        expected_version: 1,
        action: 'confirm_payment',
        values: { reference: 'secret' },
      }).success,
    ).toBe(false);
    expect(
      orderActionInput.safeParse({ expected_version: 1, action: 'ship', values: {} }).success,
    ).toBe(false);
  });
  it('allows incomplete verification drafts but preserves string identifiers', () => {
    const parsed = stepInput.safeParse({
      step: 'bank',
      expected_version: 1,
      values: {
        bank_name: '',
        branch_name: '',
        account_title: '',
        account_number: '0000123',
        account_type: 'current',
        holder_type: 'business',
        routing_number: '',
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.step === 'bank')
      expect(parsed.data.values.account_number).toBe('0000123');
  });
  it('enforces purpose-specific upload profiles', () => {
    expect(
      uploadInput.safeParse({ purpose: 'chat', parent_id: pid, mime: 'image/png', size: 20 })
        .success,
    ).toBe(false);
    expect(
      uploadInput.safeParse({
        purpose: 'verification',
        parent_id: pid,
        mime: 'application/pdf',
        size: 20,
        slot: 'identity_front',
      }).success,
    ).toBe(false);
    expect(
      uploadInput.safeParse({ purpose: 'store', parent_id: pid, mime: 'image/webp', size: 262145 })
        .success,
    ).toBe(false);
  });
  it('rejects forged MIME and size declarations', () => {
    expect(() =>
      inspectUpload(new TextEncoder().encode('<script>bad</script>'), 'image/png', 'product', 20),
    ).toThrow();
    expect(() =>
      inspectUpload(new TextEncoder().encode('%PDF-1.7'), 'application/pdf', 'verification', 8),
    ).not.toThrow();
    expect(() =>
      inspectUpload(new TextEncoder().encode('%PDF-1.7'), 'application/pdf', 'product', 8),
    ).toThrow();
  });
  for (const [code, status] of [
    ['42501', 403],
    ['23505', 409],
    ['40001', 409],
    ['PT409', 409],
    ['23503', 422],
    ['22023', 422],
    ['P0002', 404],
  ])
    it(`maps SQLSTATE ${code}`, () => expect(mapError({ code }).status).toBe(status));
  it('keeps generated endpoints aligned with the route registry', () => {
    expect(Object.keys(endpoints)).toEqual(Object.keys(routes));
    for (const [key, value] of Object.entries(routes)) {
      expect(endpoints[key as keyof typeof endpoints]).toEqual({
        method: value.method,
        path: value.path,
      });
    }
  });
});
describe('generated mobile client', () => {
  it('refreshes once while preserving a write body and idempotency key', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ error: { code: 'UNAUTHENTICATED', message: 'expired' } }, { status: 401 }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { role: 'supplier' }, meta: { request_id: pid } }),
      );
    const api = new SupplierApiClient({
      baseUrl: 'https://example.invalid/v1',
      getAccessToken: async () => 'old',
      refreshAccessToken: async () => 'new',
      fetch: fetcher,
    });
    await api.request('onboarding', { body: {}, idempotencyKey: 'stable-request-key' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      fetcher.mock.calls.map((c) => new Headers(c[1]?.headers).get('idempotency-key')),
    ).toEqual(['stable-request-key', 'stable-request-key']);
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get('authorization')).toBe('Bearer new');
  });
  it('does not automatically replay network failures', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    const api = new SupplierApiClient({
      baseUrl: 'https://example.invalid/v1',
      getAccessToken: async () => 'token',
      fetch: fetcher,
    });
    await expect(
      api.request('onboarding', { body: {}, idempotencyKey: 'stable-request-key' }),
    ).rejects.toThrow('offline');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('retains structured server conflicts for native forms', async () => {
    const api = new SupplierApiClient({
      baseUrl: 'https://example.invalid/v1',
      getAccessToken: async () => 'token',
      fetch: async () =>
        Response.json(
          { error: { code: 'VERSION_CONFLICT', message: 'Refresh' }, request_id: pid },
          { status: 409 },
        ),
    });
    await expect(api.request('products', {})).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
      requestId: pid,
    });
    expect(
      new SupplierApiError(409, { code: 'VERSION_CONFLICT', message: 'Refresh' }),
    ).toBeInstanceOf(Error);
  });
  it('encodes search input and preserves cancellation', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ data: { rows: [], total: 0 }, meta: { request_id: pid } }),
      );
    const controller = new AbortController();
    const api = new SupplierApiClient({
      baseUrl: 'https://example.invalid/v1',
      getAccessToken: async () => 'token',
      fetch: fetcher,
    });
    await api.request('products', {
      query: { search: 'cotton & shirts' },
      signal: controller.signal,
    });
    expect(String(fetcher.mock.calls[0][0])).toContain('search=cotton+%26+shirts');
    expect(fetcher.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});
