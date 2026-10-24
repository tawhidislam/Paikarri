import { z } from 'zod';
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
