import { z } from 'zod';
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
