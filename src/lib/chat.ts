import { chatImageDb } from './chat-images';
import { z } from 'zod';
import { db } from './supabase';
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
export async function startChat(business: string, product?: string) {
  const { data, error } = await db().rpc('chat_start', {
    business: z.uuid().parse(business),
    ...(product ? { product: z.uuid().parse(product) } : {}),
  });
  if (error) throw error;
  return z.object({ thread: chatThreadSchema, product: chatProductSchema.nullable() }).parse(data);
}
export async function chatThread(target: string) {
  const { data, error } = await db().rpc('chat_thread', { target: z.uuid().parse(target) });
  if (error) throw error;
  return chatThreadSchema.parse(data);
}
export async function chatList(search: string, unread_only: boolean, page: number) {
  const { data, error } = await db().rpc('chat_list', {
    search: search.slice(0, 200),
    unread_only,
    page,
    page_size: 25,
  });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(chatThreadSchema) }).parse(data);
}
export async function chatMessages(target: string, before?: ChatCursor, after?: ChatCursor) {
  const { data, error } = await db().rpc('chat_messages', {
    target,
    page_size: 50,
    ...(before ? { before_cursor: before } : {}),
    ...(after ? { after_cursor: after } : {}),
  });
  if (error) throw error;
  return chatPageSchema.parse(data);
}
export async function sendChat(target: string, body: string, nonce: string, product?: string) {
  const { data, error } = await db().rpc('chat_send', {
    target,
    body: z.string().trim().min(1).max(4000).parse(body),
    nonce: z.uuid().parse(nonce),
    ...(product ? { product } : {}),
  });
  if (error) throw error;
  return chatMessageSchema.parse(data);
}
export async function sendChatImage(
  target: string,
  body: string,
  nonce: string,
  image: string,
  product?: string,
) {
  const { data, error } = await chatImageDb().rpc('chat_send_image', {
    target,
    body: z.string().trim().max(4000).parse(body),
    nonce: z.uuid().parse(nonce),
    image: z.uuid().parse(image),
    ...(product ? { product } : {}),
  });
  if (error) throw error;
  return chatMessageSchema.parse(data);
}
export async function markChatRead(target: string, message: string) {
  const { error } = await db().rpc('chat_mark_read', { target, message });
  if (error) throw error;
}
export async function chatUnread() {
  const { data, error } = await db().rpc('chat_unread_total');
  if (error) throw error;
  return z.number().parse(data);
}
// Preserve PostgreSQL microseconds when sorting/cursor-comparing messages.
export function compareChat(a: ChatCursor, b: ChatCursor) {
  const micro = (s: string) => Number((s.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0').slice(3, 6));
  return (
    Date.parse(a.created_at) - Date.parse(b.created_at) ||
    micro(a.created_at) - micro(b.created_at) ||
    a.id.localeCompare(b.id)
  );
}
export function mergeChat(existing: ChatMessage[], incoming: ChatMessage[]) {
  return [...new Map([...existing, ...incoming].map((x) => [x.id, x])).values()].sort(compareChat);
}
export function threadName(t: ChatThread, uid: string, locale: string) {
  return t.buyer_id === uid
    ? locale === 'bn' && t.business_name_bn
      ? t.business_name_bn
      : t.business_name
    : t.buyer_name.trim() || `#${t.buyer_id.slice(0, 8).toUpperCase()}`;
}
