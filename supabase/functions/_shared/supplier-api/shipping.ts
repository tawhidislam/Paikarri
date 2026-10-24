import { z } from 'zod';
export const shippingSchema = z.object({
  enabled: z.boolean(),
  inside_dhaka_base: z.number().min(0).max(1000000),
  outside_dhaka_base: z.number().min(0).max(1000000),
  per_kg_surcharge: z.number().min(0).max(100000),
  free_shipping_threshold: z.number().positive().nullable(),
  carrier_preference: z.enum(['steadfast', 'sundarban', 'pathao', 'sa_paribahan', 'self']),
});
