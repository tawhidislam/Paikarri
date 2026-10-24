import { z } from 'zod';
export const chatProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  name_bn: z.string(),
  price: z.number(),
  moq: z.number(),
  unit: z.string(),
});
export type ChatProduct = z.infer<typeof chatProductSchema>;
export const chatMessageSchema = z.object({
  id: z.uuid(),
  conversation_id: z.uuid(),
  sender_id: z.uuid(),
  body: z.string(),
  created_at: z.string(),
  product_snapshot: chatProductSchema.nullable().optional(),
  image_id: z.uuid().nullable().optional(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export const chatCursor = z.object({ created_at: z.string(), id: z.uuid() });
export type ChatCursor = z.infer<typeof chatCursor>;
export const chatPageSchema = z.object({
  rows: z.array(chatMessageSchema),
  has_more: z.boolean(),
  oldest: chatCursor.nullable(),
  newest: chatCursor.nullable(),
});
export const chatThreadSchema = z.object({
  id: z.uuid(),
  business_id: z.uuid(),
  buyer_id: z.uuid(),
  supplier_id: z.uuid(),
  business_name: z.string(),
  business_name_bn: z.string(),
  buyer_name: z.string(),
  verified: z.boolean(),
  supplier_status: z.string(),
  created_at: z.string(),
  latest: z.object({ body: z.string(), sender_id: z.uuid(), created_at: z.string() }).nullable(),
  unread_count: z.number(),
  peer_read_at: z.string().nullable(),
  peer_read_id: z.uuid().nullable(),
});
export type ChatThread = z.infer<typeof chatThreadSchema>;
