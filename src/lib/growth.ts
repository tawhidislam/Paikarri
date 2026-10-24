import { z } from 'zod';
import { db } from './supabase';
// RPC signatures are generated from the linked cloud schema.
export const growthDb = db;
import { shippingSchema } from '../../supabase/functions/_shared/supplier-api/shipping';
export { shippingSchema };
export type ShippingPreset = z.infer<typeof shippingSchema>;
export function shippingEstimate(
  preset: ShippingPreset,
  district: string,
  weight: number,
  subtotal: number,
) {
  if (
    !preset.enabled ||
    !Number.isFinite(weight) ||
    weight <= 0 ||
    weight > 100000 ||
    !Number.isFinite(subtotal) ||
    subtotal < 0
  )
    return null;
  if (preset.free_shipping_threshold !== null && subtotal >= preset.free_shipping_threshold)
    return 0;
  return (
    Math.round(
      ((district === 'Dhaka' ? preset.inside_dhaka_base : preset.outside_dhaka_base) +
        Math.ceil(weight) * preset.per_kg_surcharge) *
        100,
    ) / 100
  );
}
export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  business_type: z.enum(['retailer', 'wholesaler', 'exporter', 'institution', 'other']),
  trade_license_number: z.string().max(100),
  address: z.string().max(500),
});
