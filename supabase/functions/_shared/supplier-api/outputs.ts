import { z } from 'zod';
import { shippingSchema } from './shipping.ts';
import { productInput } from './inputs.ts';
const json = z.json();
export const profile = z.object({
  id: z.uuid(),
  full_name: z.string(),
  phone: z.string().nullable(),
  avatar_path: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const business = z.object({
  id: z.uuid(),
  owner_id: z.uuid(),
  name: z.string(),
  name_bn: z.string(),
  description: z.string(),
  division: z.string(),
  district: z.string(),
  address: z.string(),
  contact_phone: z.string(),
  website: z.string(),
  verified: z.boolean(),
  profile_image_path: z.string().nullable(),
  verification_application_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const me = z.object({
  id: z.uuid(),
  role: z.enum(['supplier', 'buyer']),
  status: z.object({ status: z.string(), reason: z.string().optional() }).nullable(),
  business: business.nullable(),
  registration_open: z.boolean(),
});
export const overview = z.object({
  business_id: z.uuid().nullable(),
  products: z.object({
    total: z.number(),
    pending: z.number(),
    approved: z.number(),
    archived: z.number(),
  }),
  orders: z.record(z.string(), z.number()),
  unanswered_quotations: z.number(),
  unread_messages: z.number(),
  unread_notifications: z.number(),
  active_warnings: z.number(),
  verification: z.object({
    verified: z.boolean(),
    current: z
      .object({
        id: z.uuid(),
        status: z.string(),
        revision: z.number(),
        valid_until: z.string().nullable(),
        lock_version: z.number(),
      })
      .nullable(),
  }),
});
export const performance = z.object({
  inquiries: z.number(),
  responded: z.number(),
  responded_within_two_hours: z.number(),
  orders: z.number(),
  completed: z.number(),
  average_delivery_days: z.number().nullable(),
});
export const shipping = shippingSchema
  .extend({ business_id: z.uuid(), version: z.number(), updated_at: z.string() })
  .nullable();
export const reference = z.object({
  categories: z.array(
    z.object({ id: z.uuid(), name: z.string(), name_bn: z.string(), slug: z.string() }),
  ),
  locations: z.record(z.string(), z.array(z.string())),
  units: z.array(z.string()),
  settings: json,
  upload_profiles: z.record(
    z.string(),
    z.object({
      maxDimension: z.number(),
      quality: z.number(),
      minimumQuality: z.number(),
      targetBytes: z.number(),
    }),
  ),
  upload_limits: z.record(z.string(), z.number()),
  currency: z.literal('BDT'),
  business_timezone: z.literal('Asia/Dhaka'),
});
export const product = z
  .object({
    id: z.uuid(),
    business_id: z.uuid(),
    name: z.string(),
    name_bn: z.string(),
    description: z.string(),
    category_id: z.uuid(),
    price: z.number(),
    moq: z.number(),
    stock: z.number(),
    unit: z.string(),
    status: z.string(),
    updated_at: z.string(),
    specifications: z.record(z.string(), json),
    moderation_note: z.string().nullable().optional(),
    tiers: z
      .array(z.object({ min_quantity: z.number(), price: z.number() }).catchall(json))
      .optional(),
    images: z
      .array(
        z.object({ id: z.uuid(), product_id: z.uuid(), path: z.string(), position: z.number() }),
      )
      .optional(),
  })
  .catchall(json);
export const quoteResponse = z.object({
  id: z.uuid(),
  request_id: z.uuid(),
  price: z.number(),
  message: z.string(),
  created_at: z.string(),
});
export const quotation = z.object({
  id: z.uuid(),
  buyer_id: z.uuid(),
  business_id: z.uuid(),
  product_id: z.uuid(),
  quantity: z.number(),
  message: z.string(),
  created_at: z.string(),
  response: quoteResponse.nullable(),
  product: z
    .object({ id: z.uuid(), name: z.string(), name_bn: z.string(), unit: z.string() })
    .nullable(),
});
export const buyerOrganization = z
  .object({ name: z.string(), business_type: z.string() })
  .nullable();
export const review = z.object({
  id: z.uuid(),
  body: z.string(),
  rating: z.number(),
  status: z.string(),
  product_name: z.string(),
  reply: z.object({ body: z.string(), status: z.string(), version: z.number() }).nullable(),
});
export const csv = z.object({ filename: z.string(), csv: z.string() });
export const importPreview = z.object({
  rows: z.array(
    z.object({ row: z.number(), product: productInput.nullable(), error: z.string().nullable() }),
  ),
});
export const uploadTicket = z.object({
  id: z.uuid(),
  purpose: z.enum(['product', 'store', 'avatar', 'verification', 'chat']),
  parent_id: z.uuid(),
  slot: z.string().nullable(),
  bucket: z.string(),
  path: z.string(),
  mime: z.string(),
  size: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  verified: z.boolean(),
  attached: z.boolean(),
  discarded: z.boolean(),
  previous_path: z.string().nullable(),
  created_at: z.string(),
  expires_at: z.string(),
  upload_url: z.url().optional(),
  upload_token: z.string().optional(),
  upload_method: z.literal('PUT').optional(),
});
export const uploadComplete = z.object({ upload: uploadTicket, verification: json.nullable() });
export const removed = z.object({
  removed: z.literal(true),
  bucket: z.string(),
  path: z.string(),
  verification: json.optional(),
});
export const signedAsset = z.object({ url: z.url(), expires_at: z.string() });
export const updated = z.object({ updated: z.literal(true) });
export const submitted = z.object({ submitted: z.literal(true) });

export const preparedUpload = uploadTicket.required({
  upload_url: true,
  upload_token: true,
  upload_method: true,
});
