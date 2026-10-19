import { z } from 'zod';
import { db } from './supabase';
import { orderSummarySchema, orderStates, paymentStates } from './order-schema';
export const adminOrderSchema = orderSummarySchema.extend({
  buyer_id: z.uuid(),
  business_id: z.uuid(),
  order_shipments: z.array(z.object({ count: z.number() })).default([]),
  order_payments: z.array(z.object({ count: z.number() })).default([]),
});
export type AdminOrder = z.infer<typeof adminOrderSchema>;
export const adminOrderQueues = [
  ['', 'All orders'],
  ['action_required', 'Action Required'],
  ['reported', 'Bank Payment Verification'],
  ['disputed', 'Disputes & Appeals'],
  ['refund_pending', 'Refunds Pending'],
  ['fulfilment', 'In Fulfilment'],
  ['shipped', 'Shipped'],
  ['completed', 'Completed'],
] as const;
export function adminQueueFilter(state: string) {
  if (!state) return '';
  if (state === 'action_required')
    return 'status.eq.disputed,payment_status.in.(reported,refund_pending)';
  if (state === 'open')
    return 'status.in.(pending_confirmation,awaiting_acceptance,processing,shipped)';
  if (state === 'fulfilment') return 'status.in.(processing,shipped)';
  if ((orderStates as readonly string[]).includes(state)) return `status.eq.${state}`;
  if ((paymentStates as readonly string[]).includes(state)) return `payment_status.eq.${state}`;
  throw new Error('Choose a valid order queue');
}
export function adminOrderSearch(search: string) {
  const value = search.trim().slice(0, 200).replace(/["\\]/g, '');
  if (!value) return '';
  const number = /^(?:PK[-\s]*)?(\d+)$/i.exec(value)?.[1];
  return `supplier_name.ilike."%${value}%",buyer_name.ilike."%${value}%"${number && Number.isSafeInteger(Number(number)) ? `,number.eq.${Number(number)}` : ''}`;
}
export async function adminOrders(search: string, state: string, page: number, size: number) {
  z.number().int().min(1).max(100000).parse(page);
  z.union([z.literal(25), z.literal(50), z.literal(100)]).parse(size);
  let query = db()
    .from('orders')
    .select(
      'id,number,business_id,buyer_id,supplier_name,buyer_name,status,payment_status,payment_method,purchase_kind,total,created_at,updated_at,cancellation_requested,order_shipments(count),order_payments(count)',
      { count: 'exact' },
    );
  const queue = adminQueueFilter(state),
    term = adminOrderSearch(search);
  if (queue) query = query.or(queue);
  if (term) query = query.or(term);
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (error) throw error;
  if (count === null) throw new Error('Order count unavailable. Please retry.');
  return { rows: z.array(adminOrderSchema).parse(data), total: count };
}
export async function adminOrderCounts() {
  const values = await Promise.all(
    ['open', 'action_required', 'reported', 'disputed', 'refund_pending'].map(async (state) => {
      const { error, count } = await db()
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .or(adminQueueFilter(state));
      if (error) throw error;
      if (count === null) throw new Error('Order count unavailable. Please retry.');
      return [state, count] as const;
    }),
  );
  return Object.fromEntries(values) as Record<string, number>;
}
export function bangladeshContact(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const international = /^01[3-9]\d{8}$/.test(digits) ? `88${digits}` : digits;
  return /^8801[3-9]\d{8}$/.test(international)
    ? { tel: `+${international}`, whatsapp: international }
    : null;
}
