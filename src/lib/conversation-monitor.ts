import { chatProductSchema } from './chat';
import { z } from 'zod';
import { db } from './supabase';
export const monitorCursorSchema = z.object({ created_at: z.string(), id: z.uuid() });
export type MonitorCursor = z.infer<typeof monitorCursorSchema>;
export const monitorMessageSchema = z.object({
  id: z.uuid(),
  conversation_id: z.uuid(),
  sender_id: z.uuid(),
  body: z.string(),
  product_snapshot: chatProductSchema.nullable().optional(),
  image_id: z.uuid().nullable().optional(),
  created_at: z.string(),
});
export type MonitorMessage = z.infer<typeof monitorMessageSchema>;
export const monitorPageSchema = z.object({
  rows: z.array(monitorMessageSchema),
  has_more: z.boolean(),
  oldest: monitorCursorSchema.nullable(),
  newest: monitorCursorSchema.nullable(),
});
export const monitorRowSchema = z.object({
  id: z.uuid(),
  business_id: z.uuid(),
  supplier_id: z.uuid(),
  supplier_name: z.string(),
  supplier_status: z.string(),
  customer_id: z.uuid(),
  customer_name: z.string(),
  customer_email: z.string().nullable(),
  created_at: z.string(),
  last_activity: z.string(),
  message_count: z.number(),
});
export const monitorOpenSchema = z.object({
  access_id: z.uuid(),
  conversation: z.object({ id: z.uuid(), created_at: z.string() }),
  supplier: z.object({
    id: z.uuid(),
    business_id: z.uuid(),
    name: z.string(),
    email: z.string().nullable(),
    status: z.string(),
  }),
  customer: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.string().nullable(),
    status: z.string(),
  }),
  messages: monitorPageSchema,
});
export type MonitorOpen = z.infer<typeof monitorOpenSchema>;
export async function monitorList(filters: Record<string, string>, page: number, size: number) {
  const { data, error } = await db().rpc('admin_monitor_list', {
    filters,
    page,
    page_size: size,
  });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(monitorRowSchema) }).parse(data);
}
export async function monitorOpen(target: string) {
  const { data, error } = await db().rpc('admin_monitor_open', {
    target: z.uuid().parse(target),
  });
  if (error) throw error;
  return monitorOpenSchema.parse(data);
}
export async function monitorMessages(
  target: string,
  accessId: string,
  direction: 'before' | 'after',
  cursor: MonitorCursor,
) {
  const { data, error } = await db().rpc('admin_monitor_messages', {
    access_id: z.uuid().parse(accessId),
    target: z.uuid().parse(target),
    [direction === 'before' ? 'before_cursor' : 'after_cursor']: cursor,
    page_size: 50,
  });
  if (error) throw error;
  return monitorPageSchema.parse(data);
}
// PostgreSQL preserves microseconds; Date.parse alone truncates them to milliseconds.
const subMillisecond = (stamp: string) =>
  Number((stamp.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0').slice(3, 6));
export function mergeMonitorMessages(existing: MonitorMessage[], incoming: MonitorMessage[]) {
  const merged = new Map([...existing, ...incoming].map((message) => [message.id, message]));
  return [...merged.values()].sort(
    (a, b) =>
      Date.parse(a.created_at) - Date.parse(b.created_at) ||
      subMillisecond(a.created_at) - subMillisecond(b.created_at) ||
      a.id.localeCompare(b.id),
  );
}
