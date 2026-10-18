import { z } from 'zod';
import { db } from './supabase';
export const skuSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  stock: z.number().int().nonnegative(),
  active: z.boolean(),
  image_id: z.uuid().nullable(),
  version: z.number().int(),
  options: z.record(z.string(), z.string()),
  prices: z.array(
    z.object({ min_quantity: z.number().int().positive(), price: z.number().positive() }),
  ),
});
export const sourcingSchema = z
  .object({
    product_id: z.uuid(),
    preparation_min: z.number().int().min(0).max(365),
    preparation_max: z.number().int().min(0).max(365),
    dispatch_location: z.string().max(200),
    packaging: z.string().max(500),
    delivery_notes: z.string().max(2000),
    samples_enabled: z.boolean(),
    sample_limit: z.number().int().min(1).max(10),
    customization_enabled: z.boolean(),
    customization_moq: z.number().int().positive(),
    estimates_updated_at: z.string().nullable(),
    version: z.number().int(),
  })
  .refine((v) => v.preparation_max >= v.preparation_min, 'Preparation range is invalid');
export const optionsSchema = z.object({
  sourcing: sourcingSchema,
  attributes: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
  skus: z.array(skuSchema),
});
export type ProductOptions = z.infer<typeof optionsSchema>;
export type Sku = z.infer<typeof skuSchema>;
export type Selection = { sku_id: string; quantity: number };
export async function productOptions(target: string) {
  const { data, error } = await db().rpc('product_options', { target });
  if (error) throw error;
  return optionsSchema.parse(data);
}
export async function setSkuCart(product: string, selections: Selection[]) {
  z.array(z.object({ sku_id: z.uuid(), quantity: z.number().int().positive() }))
    .max(100)
    .parse(selections);
  const { error } = await db().rpc('cart_skus_set', { product, selections });
  if (error) throw error;
}
export function selectedPrice(sku: Sku, total: number) {
  const tiers = [...sku.prices].sort((a, b) => b.min_quantity - a.min_quantity);
  return (tiers.find((p) => p.min_quantity <= total) ?? tiers.at(-1))?.price ?? 0;
}
export function selectionTotal(skus: Sku[], selections: Selection[]) {
  const qty = selections.reduce((n, s) => n + s.quantity, 0);
  return (
    selections.reduce(
      (n, s) =>
        n +
        Math.round(
          (skus.find((k) => k.id === s.sku_id)
            ? selectedPrice(
                skus.find((k) => k.id === s.sku_id)!,
                qty,
              )
            : 0) *
            s.quantity *
            100,
        ),
      0,
    ) / 100
  );
}
export const variantLabel = (options: Record<string, string>) =>
  Object.entries(options)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
export async function saveOptions(
  target: string,
  expected_version: number,
  payload: { skus: unknown[]; sourcing: unknown },
) {
  const skuInput = skuSchema.omit({ id: true }).extend({
    id: z.uuid().optional(),
    code: z.string().trim().min(1).max(80),
    options: z
      .record(z.string().min(1).max(60), z.string().trim().min(1).max(80))
      .refine((v) => Object.keys(v).length <= 3),
    prices: z
      .array(
        z.object({
          min_quantity: z.number().int().min(1).max(1000000),
          price: z.number().positive().max(999999999999),
        }),
      )
      .min(1)
      .max(21),
  });
  const parsed = z
    .object({ skus: z.array(skuInput).min(1).max(100), sourcing: sourcingSchema })
    .parse(payload);
  const { data, error } = await db().rpc('supplier_options_save', {
    target,
    expected_version,
    payload: JSON.parse(JSON.stringify(parsed)),
  });
  if (error) throw error;
  return optionsSchema.parse(data);
}
export const requestLine = z.object({
  sku_id: z.uuid(),
  quantity: z.number().int().min(1).max(1000000),
});
export const requestInput = z.object({
  product_id: z.uuid(),
  kind: z.enum(['wholesale', 'sample', 'customization']),
  requirements: z.string().trim().min(10).max(5000),
  branding: z.string().max(2000),
  packaging: z.string().max(2000),
  specifications: z.string().max(2000),
  desired_date: z.string().nullable(),
  district: z.string().min(2).max(80),
  lines: z.array(requestLine).min(1).max(100),
});
export const requestRevision = z.object({
  revision: z.number(),
  version: z.number(),
  requirements: z.string(),
  branding: z.string(),
  packaging: z.string(),
  specifications: z.string(),
  desired_date: z.string().nullable(),
  district: z.string(),
  submitted_at: z.string().nullable(),
  lines: z.array(requestLine.extend({ options: z.record(z.string(), z.string()) })),
  files: z.array(
    z.object({ id: z.uuid(), mime: z.string(), size: z.number(), verified: z.boolean() }),
  ),
});
export const offerSchema = z.object({
  id: z.uuid(),
  revision: z.number(),
  request_revision: z.number(),
  expires_at: z.string(),
  notes: z.string(),
  preparation_min: z.number(),
  preparation_max: z.number(),
  accepted_order_id: z.uuid().nullable(),
  lines: z.array(requestLine.extend({ unit_price: z.number().positive() })),
});
export const requestDetail = z.object({
  id: z.uuid(),
  buyer_id: z.uuid(),
  product_id: z.uuid(),
  business_id: z.uuid(),
  kind: z.enum(['wholesale', 'sample', 'customization']),
  revision: z.number(),
  product_name: z.string(),
  revisions: z.array(requestRevision),
  offers: z.array(offerSchema),
});
export async function getRequest(target: string) {
  const { data, error } = await db().rpc('sourcing_detail', { target });
  if (error) throw error;
  return requestDetail.parse(data);
}
export async function saveRequest(
  target: string | null,
  expected_version: number,
  payload: z.infer<typeof requestInput>,
) {
  const { data, error } = await db().rpc('sourcing_draft', {
    target: target!,
    expected_version,
    payload: requestInput.parse(payload),
  });
  if (error) throw error;
  return z.uuid().parse(data);
}
export async function submitRequest(target: string, expected_version: number) {
  const { error } = await db().rpc('sourcing_submit', { target, expected_version });
  if (error) throw error;
}
export const requestSummary = z.object({
  id: z.uuid(),
  kind: z.string(),
  revision: z.number(),
  created_at: z.string(),
  product_name: z.string(),
  supplier_name: z.string(),
  buyer_name: z.string(),
  submitted_at: z.string().nullable(),
});
export async function listRequests(page = 1) {
  const { data, error } = await db().rpc('sourcing_list', { page, page_size: 25 });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(requestSummary) }).parse(data);
}
export async function requestFile(id: string, download = false) {
  const { data, error } = await db().rpc('sourcing_file_access', { target: id });
  if (error) throw error;
  const result = await db()
    .storage.from('request-attachments')
    .createSignedUrl(
      z.string().parse(data),
      300,
      download ? { download: 'request-document.pdf' } : undefined,
    );
  if (result.error) throw result.error;
  return result.data.signedUrl;
}

// Resize only the buyer's chosen variants; never silently add another color/size.
export function quantitiesForTier(
  skus: Sku[],
  selections: Selection[],
  target: number,
): Selection[] | null {
  if (!Number.isSafeInteger(target) || target < 1 || target > 1000000) return null;
  const chosen = skus.filter(
    (s) => s.active && selections.some((r) => r.sku_id === s.id && r.quantity > 0),
  );
  const candidates = chosen.length ? chosen : skus.length === 1 && skus[0].active ? skus : [];
  if (candidates.reduce((n, s) => n + s.stock, 0) < target) return null;
  const weights = candidates.map((s) =>
    Math.max(0, selections.find((r) => r.sku_id === s.id)?.quantity ?? 0),
  );
  const sum = weights.reduce((n, q) => n + q, 0);
  const amounts = candidates.map((s, i) =>
    Math.min(s.stock, Math.floor(target * (sum ? weights[i] / sum : 1 / candidates.length))),
  );
  let remaining = target - amounts.reduce((n, q) => n + q, 0);
  for (let i = 0; i < candidates.length && remaining; i++) {
    const add = Math.min(remaining, candidates[i].stock - amounts[i]);
    amounts[i] += add;
    remaining -= add;
  }
  return candidates.flatMap((s, i) => (amounts[i] ? [{ sku_id: s.id, quantity: amounts[i] }] : []));
}
