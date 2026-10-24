import { z } from 'zod';
import { routes, type Operation, type Route } from './routes.ts';
import { imageUploadProfiles } from './image-profiles.ts';
import { locations } from './locations.ts';
import { supportedUnits } from './units.ts';
import { csvText, productColumns, validateProductCsv } from './csv.ts';

export type Json = z.infer<ReturnType<typeof z.json>>;
export type ObjectData = Record<string, unknown>;
export interface Backend {
  userId: string;
  rpc(name: string, args?: ObjectData): Promise<unknown>;
  one(table: string, columns: string, match: ObjectData): Promise<unknown>;
  rows(table: string, columns: string, match?: ObjectData): Promise<unknown[]>;
  signUpload(ticket: ObjectData): Promise<unknown>;
  verifyUpload(ticket: ObjectData): Promise<void>;
  removeFile(asset: ObjectData): Promise<void>;
  signRead(asset: ObjectData): Promise<unknown>;
}
export interface Dependencies {
  authenticate(request: Request): Promise<Backend>;
  log(event: {
    request_id: string;
    operation: string;
    route: string;
    status: number;
    duration_ms: number;
    code?: string;
  }): void;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, idempotency-key, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'x-request-id, retry-after',
  'Cache-Control': 'no-store',
};
export function mapError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof z.ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'input';
      (fields[key] ??= []).push(issue.message);
    }
    return new ApiError(422, 'VALIDATION_FAILED', 'Check the highlighted fields.', fields);
  }
  const e =
    error && typeof error === 'object' ? (error as { code?: string; message?: string }) : {};
  if (e.code === 'PT409' || e.code === '40001' || e.code === '23505')
    return new ApiError(
      409,
      e.message?.includes('Idempotency') ? 'IDEMPOTENCY_CONFLICT' : 'VERSION_CONFLICT',
      'The resource or request changed. Refresh before trying again.',
    );
  if (e.code === '42501')
    return new ApiError(403, 'ACCESS_DENIED', 'You do not have access to this operation.');
  if (e.code === 'P0002' || e.code === 'PGRST116')
    return new ApiError(404, 'NOT_FOUND', 'The requested resource is unavailable.');
  if (e.code === 'P0001' && /rate limit|too many|limit exceeded/i.test(e.message ?? ''))
    return new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.');
  if (
    ['22023', '22P02', '22007', '22008', '22003', '23502', '23514', '23503', 'P0001'].includes(
      e.code ?? '',
    )
  )
    return new ApiError(
      422,
      'BUSINESS_RULE',
      'The request does not satisfy the current business rules.',
    );
  return new ApiError(500, 'INTERNAL_ERROR', 'The request could not be completed.');
}
function object(value: unknown): ObjectData {
  return z.record(z.string(), z.unknown()).parse(value);
}
function pageArgs(q: ObjectData) {
  return { page: q.page ?? 1, page_size: 25 };
}
function id(value: string | undefined) {
  return z.uuid().parse(value);
}
async function bodyJson(request: Request): Promise<unknown> {
  const limit = 4300000;
  if (Number(request.headers.get('content-length') ?? 0) > limit)
    throw new ApiError(413, 'BODY_TOO_LARGE', 'Request body is too large.');
  if (!request.body) return {};
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'JSON_REQUIRED', 'Use application/json.');
  const reader = request.body.getReader();
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError(413, 'BODY_TOO_LARGE', 'Request body is too large.');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes) || '{}');
  } catch {
    throw new ApiError(422, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}
function matchRoute(
  method: string,
  path: string,
): { operation: Operation; route: Route; params: Record<string, string> } | null {
  for (const [operation, route] of Object.entries(routes)) {
    if (route.method !== method) continue;
    const names: string[] = [];
    const pattern = route.path.replace(/\{([^}]+)\}/g, (_m, name) => {
      names.push(name);
      return '([^/]+)';
    });
    const match = path.match(new RegExp('^' + pattern + '/?$'));
    if (!match) continue;
    const params = Object.fromEntries(
      names.map((name, i) => [name, decodeURIComponent(match[i + 1])]),
    );
    if (params.id) id(params.id);
    if (params.sku_id) id(params.sku_id);
    return { operation: operation as Operation, route, params };
  }
  return null;
}
async function readOperation(
  operation: Operation,
  backend: Backend,
  params: Record<string, string>,
  query: ObjectData,
): Promise<unknown> {
  const rpc = (name: string, args?: ObjectData) => backend.rpc(name, args);
  const own = () => backend.one('businesses', '*', { owner_id: backend.userId });
  const target = params.id;
  switch (operation) {
    case 'me': {
      const [role, status, business, settings] = await Promise.all([
        backend.one('user_roles', 'role', { user_id: backend.userId }),
        rpc('get_account_status'),
        own(),
        rpc('get_platform_settings'),
      ]);
      return {
        id: backend.userId,
        role: object(role).role,
        status,
        business,
        registration_open: object(settings).supplier_registration_open,
      };
    }
    case 'business':
      return own();
    case 'profile':
      return backend.one('profiles', '*', { id: backend.userId });
    case 'overview':
    case 'products':
    case 'product':
    case 'quotations':
    case 'quotation':
      return rpc('supplier_api_read', { operation, target: target ?? null, filters: query });
    case 'orders':
    case 'order':
      return rpc('supplier_api_read', { operation, target: target ?? null, filters: query });
    case 'performance':
      return rpc('supplier_performance');
    case 'shipping':
      return rpc('shipping_preset_get');
    case 'reference':
      return {
        categories: await backend.rows('categories', 'id,name,name_bn,slug'),
        locations,
        units: supportedUnits,
        settings: await rpc('get_platform_settings'),
        upload_profiles: imageUploadProfiles,
        upload_limits: {
          product: 5242880,
          store: 262144,
          avatar: 2097152,
          verification: 10485760,
          chat: 1048576,
        },
        currency: 'BDT',
        business_timezone: 'Asia/Dhaka',
      };
    case 'options':
      await rpc('supplier_api_read', { operation: 'product', target });
      return rpc('product_options', { target });
    case 'requests':
      return rpc('sourcing_list', pageArgs(query));
    case 'request': {
      const detail = object(await rpc('sourcing_detail', { target }));
      return {
        ...detail,
        buyer_organization: await rpc('buyer_organization_context', { target: detail.buyer_id }),
      };
    }
    case 'conversations':
      return rpc('chat_list', {
        ...pageArgs(query),
        search: query.search,
        unread_only: query.unread_only === 'true',
      });
    case 'conversation':
      return rpc('chat_thread', { target });
    case 'messages':
      return rpc('chat_messages', {
        target,
        page_size: 50,
        before_cursor: query.before ?? null,
        after_cursor: query.after ?? null,
      });
    case 'verification':
      return rpc('verification_state');
    case 'verificationApplication':
      return rpc('verification_get', { target });
    case 'actions':
      return rpc('supplier_action_list', pageArgs(query));
    case 'reviews':
      return rpc('supplier_reviews', { page: query.page });
    case 'tenders':
      return query.view === 'mine'
        ? rpc('supplier_api_read', { operation: 'tenders_mine', filters: query })
        : rpc('tender_list', {
            ...pageArgs(query),
            view_kind: 'open',
            search: query.search,
            category: query.category ?? null,
          });
    case 'tender':
      return rpc('tender_detail', { target });
    case 'notifications':
      return rpc('get_notification_inbox', {
        ...pageArgs(query),
        unread_only: query.unread_only === 'true',
      });
    case 'unreadNotifications':
      return rpc('notification_unread_count');
    case 'importTemplate':
      return { filename: 'product-template.csv', csv: csvText([[...productColumns]]) };
    case 'importCategories': {
      const cats = await backend.rows('categories', 'slug,name,name_bn');
      return {
        filename: 'category-reference.csv',
        csv: csvText([
          ['slug', 'name', 'name_bn'],
          ...cats.map((c) => {
            const row = object(c);
            return [row.slug, row.name, row.name_bn];
          }),
        ]),
      };
    }
    case 'exportProducts': {
      const products = z
        .array(z.record(z.string(), z.unknown()))
        .parse(await rpc('supplier_api_read', { operation: 'export' }));
      return {
        filename: 'supplier-products.csv',
        csv: csvText([
          [...productColumns],
          ...products.map((p) => [
            p.name,
            p.name_bn,
            p.description,
            p.category_slug,
            p.price,
            p.moq,
            p.stock,
            p.unit,
            JSON.stringify(p.specifications),
            JSON.stringify(p.tiers),
          ]),
        ]),
      };
    }
    case 'upload': {
      const ticket = object(await rpc('supplier_api_upload_info', { target }));
      return {
        ...ticket,
        ...(!ticket.discarded && !ticket.attached ? object(await backend.signUpload(ticket)) : {}),
      };
    }
    case 'readAsset': {
      const purpose = z
        .enum(['product', 'store', 'avatar', 'verification', 'legacy', 'chat', 'request'])
        .parse(params.purpose);
      return backend.signRead(object(await rpc('supplier_api_asset', { purpose, target })));
    }
    default:
      throw new ApiError(404, 'NOT_FOUND', 'Unknown endpoint.');
  }
}
export function createSupplierApi(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const started = Date.now(),
      requestId = crypto.randomUUID();
    let operation = 'unknown';
    let routePattern = 'unmatched';
    const respond = (body: unknown, status = 200) => {
      deps.log({
        request_id: requestId,
        operation,
        route: routePattern,
        status,
        duration_ms: Date.now() - started,
        ...(status >= 400 ? { code: (body as { error: { code: string } }).error.code } : {}),
      });
      return Response.json(body, {
        status,
        headers: {
          ...cors,
          'X-Request-ID': requestId,
          ...(status === 429 ? { 'Retry-After': '60' } : {}),
        },
      });
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const url = new URL(request.url);
      // The Cloud gateway removes /functions/v1 before invoking the Edge runtime.
      const prefix = ['/functions/v1/supplier-api/v1', '/supplier-api/v1'].find(
        (candidate) => url.pathname === candidate || url.pathname.startsWith(candidate + '/'),
      );
      if (!prefix) throw new ApiError(404, 'NOT_FOUND', 'Unknown API version.');
      const match = matchRoute(request.method, url.pathname.slice(prefix.length) || '/');
      if (!match) throw new ApiError(404, 'NOT_FOUND', 'Unknown endpoint or method.');
      operation = match.operation;
      routePattern = match.route.path;
      if (!/^Bearer\s+\S+$/i.test(request.headers.get('authorization') ?? ''))
        throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in required.');
      const backend = await deps.authenticate(request);
      const role = object(
        await backend.one('user_roles', 'role', { user_id: backend.userId }),
      ).role;
      if (
        role !== 'supplier' &&
        !((operation === 'onboarding' || operation === 'me') && role === 'buyer')
      )
        throw new ApiError(403, 'SUPPLIER_REQUIRED', 'Supplier account required.');
      const query = object(match.route.query.parse(Object.fromEntries(url.searchParams)));
      let result: unknown;
      if (match.route.method === 'GET')
        result = await readOperation(match.operation, backend, match.params, query);
      else {
        const key = request.headers.get('idempotency-key');
        if (!key || key.length < 8 || key.length > 200)
          throw new ApiError(
            422,
            'IDEMPOTENCY_KEY_REQUIRED',
            'Provide an Idempotency-Key of 8–200 characters.',
          );
        let payload = object(match.route.body.parse(await bodyJson(request)));
        if (operation === 'validateImport') {
          const csv = String(payload.csv);
          if (new TextEncoder().encode(csv).length > 2097152)
            throw new ApiError(422, 'CSV_TOO_LARGE', 'CSV must be at most 2 MB.');
          const cats = z
            .array(z.object({ id: z.uuid(), slug: z.string() }))
            .parse(await backend.rows('categories', 'id,slug'));
          try {
            result = { rows: validateProductCsv(csv, cats) };
          } catch {
            throw new ApiError(
              422,
              'INVALID_CSV',
              'Use the supplied CSV headers, quoting and 1–100 product rows.',
            );
          }
        } else {
          const target =
            operation === 'inventory' ? match.params.sku_id : (match.params.id ?? null);
          if (operation === 'removeAsset')
            payload = {
              ...payload,
              purpose: z.enum(['product', 'store', 'avatar', 'chat']).parse(match.params.purpose),
            };
          if (operation === 'inventory') payload = { ...payload, product_id: match.params.id };
          if (operation === 'saveVerification') {
            const values = object(payload.values);
            payload = {
              ...payload,
              values: Object.fromEntries(
                Object.entries(values).map(([key, value]) => [
                  key,
                  ['dob', 'issued_on', 'expires_on'].includes(key) && value === '' ? null : value,
                ]),
              ),
            };
          }
          if (operation === 'completeUpload') {
            const ticket = object(await backend.rpc('supplier_api_upload_info', { target }));
            if (!ticket.attached && !ticket.discarded) await backend.verifyUpload(ticket);
          }
          result = await backend.rpc('supplier_api_command', {
            operation: 'command' in match.route ? match.route.command : '',
            target,
            payload,
            idempotency_key: key,
          });
          if (operation === 'prepareUpload') {
            const ticket = object(result);
            result = { ...ticket, ...object(await backend.signUpload(ticket)) };
          }
          if (operation === 'removeUpload' || operation === 'removeAsset')
            await backend.removeFile(object(result));
          if (operation === 'removeVerificationFile' && object(result)._cleanup)
            await backend.removeFile(object(object(result)._cleanup));
        }
      }
      const parsed = match.route.output.safeParse(result);
      if (!parsed.success)
        throw new ApiError(
          500,
          'INVALID_BACKEND_RESPONSE',
          'The server returned an unexpected response.',
        );
      const data = parsed.data;
      let pagination: ObjectData = {};
      if (match.route.paginated) {
        const list = object(data);
        pagination = {
          page: query.page,
          page_size: 25,
          total: list.total,
          has_more: Number(query.page) * 25 < Number(list.total),
        };
      }
      return respond(
        { data, meta: { request_id: requestId, ...pagination } },
        match.route.method === 'POST' &&
          [
            'createProduct',
            'createBusiness',
            'publishOffer',
            'prepareUpload',
            'startVerification',
          ].includes(operation)
          ? 201
          : 200,
      );
    } catch (error) {
      const e = mapError(error);
      return respond(
        {
          error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}) },
          request_id: requestId,
        },
        e.status,
      );
    }
  };
}
