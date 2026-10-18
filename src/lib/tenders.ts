import { z } from 'zod';
import { growthDb } from './growth';
export const tenderInput = z.object({
  title: z.string().trim().min(5).max(200),
  requirements: z.string().trim().min(20).max(5000),
  category_id: z.uuid(),
  quantity: z.number().int().min(1).max(1000000),
  unit: z.string().min(1).max(30),
  district: z.string().min(2).max(80),
  delivery_date: z.string().min(10),
  expires_at: z.iso.datetime({ offset: true }),
});
export const tenderSummary = z.object({
  id: z.uuid(),
  title: z.string(),
  quantity: z.number(),
  unit: z.string(),
  district: z.string(),
  delivery_date: z.string(),
  expires_at: z.string(),
  status: z.enum(['open', 'closed', 'awarded']),
  moderation: z.enum(['pending', 'approved', 'rejected']),
  version: z.number(),
  created_at: z.string(),
});
export const bidSchema = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  supplier_name: z.string(),
  notes: z.string(),
  preparation_min: z.number(),
  preparation_max: z.number(),
  expires_at: z.string(),
  version: z.number(),
  request_id: z.string().nullable(),
  offer_id: z.string().nullable(),
  lines: z.array(z.object({ sku_id: z.uuid(), quantity: z.number(), unit_price: z.number() })),
});
export const tenderDetail = tenderSummary.extend({
  requirements: z.string(),
  category_id: z.uuid(),
  is_owner: z.boolean(),
  moderation_note: z.string(),
  bids: z.array(bidSchema),
});
export async function tenderList(view_kind = 'open', search = '', page = 1, category?: string) {
  const { data, error } = await growthDb().rpc('tender_list', {
    view_kind,
    search,
    page,
    page_size: 25,
    category,
  });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(tenderSummary) }).parse(data);
}
export async function tenderRead(target: string) {
  const { data, error } = await growthDb().rpc('tender_detail', { target });
  if (error) throw error;
  return tenderDetail.parse(data);
}
