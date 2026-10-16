import { z } from 'zod';
import { locations } from './locations';
export const authSchema = z.object({
  email: z.email(),
  password: z.string().min(10, 'Use at least 10 characters.').max(128),
  full_name: z.string().min(2).max(120).optional(),
});
export const loginSchema = authSchema.pick({ email: true }).extend({ password: z.string().min(1) });
export const productSchema = z
  .object({
    name: z.string().min(3).max(200),
    name_bn: z.string().max(200),
    description: z.string().min(10).max(20000),
    category_id: z.uuid(),
    price: z.number().positive().max(999999999999),
    moq: z.number().int().positive(),
    stock: z.number().int().nonnegative(),
    unit: z.string().min(1).max(30),
    specifications: z.record(z.string(), z.string()),
    tiers: z
      .array(z.object({ min_quantity: z.number().int().positive(), price: z.number().positive() }))
      .max(20),
  })
  .refine((x) => new Set(x.tiers.map((t) => t.min_quantity)).size === x.tiers.length, {
    message: 'Tier quantities must be unique.',
    path: ['tiers'],
  });
export const businessSchema = z
  .object({
    name: z.string().min(2).max(160),
    name_bn: z.string().max(160),
    description: z.string().max(10000),
    division: z.string(),
    district: z.string(),
    address: z.string().max(500),
    contact_phone: z
      .string()
      .regex(/^\+?8801[3-9][0-9]{8}$/, 'Use a Bangladesh mobile number, e.g. +8801712345678.'),
    website: z.union([
      z.literal(''),
      z.url().refine((x) => x.startsWith('https://'), 'Use an HTTPS URL.'),
    ]),
  })
  .refine((x) => locations[x.division]?.includes(x.district), {
    message: 'Choose a district in the selected division.',
    path: ['district'],
  });
export const quoteSchema = z.object({
  quantity: z.number().int().positive(),
  message: z.string().min(10).max(3000),
});
export const messageSchema = z.string().trim().min(1).max(4000);
