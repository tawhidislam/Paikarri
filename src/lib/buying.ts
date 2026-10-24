import {
  requestInput,
  requestDetail,
  requestSummary,
} from '../../supabase/functions/_shared/supplier-api/sourcing-schema';
export * from '../../supabase/functions/_shared/supplier-api/sourcing-schema';
import { z } from 'zod';
import { db } from './supabase';
import {
  optionsSchema,
  skuSchema,
  sourcingSchema,
  type Sku,
  type Selection,
} from '../../supabase/functions/_shared/supplier-api/buying-schema';
export * from '../../supabase/functions/_shared/supplier-api/buying-schema';
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
