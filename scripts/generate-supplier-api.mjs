import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { routes } from '../supabase/functions/_shared/supplier-api/routes.ts';
const schemas = {};
const paths = {};
const endpoints = {};
function schema(name, value) {
  const json = z.toJSONSchema(value, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
    io: 'input',
  });
  delete json.$schema;
  const rewrite = (value) => {
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, val]) => [
          key,
          key === '$ref' && typeof val === 'string' && val.startsWith('#/$defs/')
            ? `#/components/schemas/${name}/${val.slice(2)}`
            : rewrite(val),
        ]),
      );
    return value;
  };
  schemas[name] = rewrite(json);
  return { $ref: `#/components/schemas/${name}` };
}
for (const [operation, route] of Object.entries(routes)) {
  const parameters = [...route.path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    schema:
      name === 'purpose'
        ? {
            type: 'string',
            enum: ['product', 'store', 'avatar', 'verification', 'legacy', 'chat', 'request'],
          }
        : { type: 'string', format: 'uuid' },
  }));
  const query = z.toJSONSchema(route.query, { unrepresentable: 'any', io: 'input' });
  for (const [name, value] of Object.entries(query.properties ?? {}))
    parameters.push({
      name,
      in: 'query',
      required: (query.required ?? []).includes(name),
      schema: value,
    });
  if (route.idempotent)
    parameters.push({
      name: 'Idempotency-Key',
      in: 'header',
      required: true,
      schema: { type: 'string', minLength: 8, maxLength: 200 },
      description:
        'Reuse the same key and payload for retries. Retained transactionally for 24 hours.',
    });
  const success = schema(
    operation + 'Response',
    z.object({
      data: route.output,
      meta: z.object({
        request_id: z.string().uuid(),
        ...(route.paginated
          ? {
              page: z.number().int(),
              page_size: z.literal(25),
              total: z.number().int(),
              has_more: z.boolean(),
            }
          : {}),
      }),
    }),
  );
  const status =
    route.method === 'POST' &&
    [
      'createProduct',
      'createBusiness',
      'publishOffer',
      'prepareUpload',
      'startVerification',
    ].includes(operation)
      ? '201'
      : '200';
  const entry = {
    operationId: operation,
    tags: [route.path.split('/')[1]],
    parameters,
    responses: {
      [status]: { description: 'Success', content: { 'application/json': { schema: success } } },
      ...Object.fromEntries(
        [401, 403, 404, 409, 413, 415, 422, 429, 500, 503].map((code) => [
          code,
          {
            description: 'API error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        ]),
      ),
    },
  };
  if (route.method !== 'GET')
    entry.requestBody = {
      required: true,
      content: { 'application/json': { schema: schema(operation + 'Body', route.body) } },
    };
  (paths[route.path] ??= {})[route.method.toLowerCase()] = entry;
  endpoints[operation] = { method: route.method, path: route.path };
}
const apiError = {
  type: 'object',
  required: ['error', 'request_id'],
  properties: {
    request_id: { type: 'string', format: 'uuid' },
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        fields: {
          type: 'object',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};
const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Paikarii Supplier Mobile API',
    version: '1.0.0',
    description:
      'Full supplier workspace API. Auth uses Supabase Auth; private files use short-lived Storage URLs. BDT values are JSON numbers. Business deadlines use Asia/Dhaka.',
  },
  servers: [
    {
      url: 'https://{project}.supabase.co/functions/v1/supplier-api/v1',
      variables: { project: { default: 'YOUR_PROJECT_REF' } },
    },
  ],
  security: [{ bearerAuth: [] }],
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: { ...schemas, ApiError: apiError },
  },
};
const client = (
  await readFile(new URL('./templates/supplier-client.ts', import.meta.url), 'utf8')
).replace(
  '// ENDPOINTS',
  'export const endpoints = ' + JSON.stringify(endpoints, null, 2) + ' as const;\n',
);
const artifacts = [
  ['docs/api/supplier.openapi.json', JSON.stringify(openapi, null, 2) + '\n'],
  ['src/mobile/supplier-client.ts', client],
];
for (const [path, content] of artifacts) {
  if (process.argv.includes('--check')) {
    if ((await readFile(path, 'utf8')) !== content)
      throw new Error(`${path} is stale; run npm run api:generate`);
  } else await writeFile(path, content);
}
console.log(
  `${process.argv.includes('--check') ? 'Checked' : 'Generated'} ${Object.keys(routes).length} supplier operations.`,
);
