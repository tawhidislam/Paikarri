import { z } from 'zod';
import { locations } from './locations';
export const orderStates = [
  'pending_confirmation',
  'awaiting_acceptance',
  'processing',
  'shipped',
  'completed',
  'cancelled',
  'disputed',
] as const;
export const paymentStates = ['unpaid', 'reported', 'paid', 'refund_pending', 'refunded'] as const;
export const orderLabels: Record<string, string> = {
  pending_confirmation: 'Awaiting supplier',
  awaiting_acceptance: 'Review delivery terms',
  processing: 'Preparing order',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'In dispute',
  unpaid: 'Unpaid',
  reported: 'Payment reported',
  paid: 'Paid',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
  cod: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
  placed: 'Order placed',
  confirm: 'Supplier confirmed',
  accept: 'Delivery terms accepted',
  cancel: 'Order cancelled',
  request_cancel: 'Cancellation requested',
  decline_cancel: 'Cancellation declined',
  authorize_return: 'Return authorized',
  return_ship: 'Return dispatched',
  return_received: 'Return received',
  ship: 'Shipment dispatched',
  receive: 'Receipt confirmed',
  report_payment: 'Bank payment reported',
  confirm_payment: 'Payment verified',
  confirm_refund: 'Refund verified',
  dispute: 'Dispute opened',
  resolve_cancel: 'Dispute resolved: cancelled',
  resolve_resume: 'Dispute resolved: resumed',
  resolve_complete: 'Dispute resolved: completed',
  note: 'Order note',
  expired: 'Order expired',
};
export const deliverySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .regex(/^(\+?8801[3-9][0-9]{8}|01[3-9][0-9]{8})$/, 'Enter a valid Bangladesh mobile number'),
    division: z.string(),
    district: z.string(),
    address: z.string().trim().min(10).max(500),
  })
  .superRefine((v, ctx) => {
    if (!locations[v.division]?.includes(v.district))
      ctx.addIssue({
        code: 'custom',
        path: ['district'],
        message: 'Select a valid division and district',
      });
  });
export const checkoutSchema = z.object({
  address: deliverySchema,
  method: z.enum(['cod', 'bank_transfer']),
  note: z.string().trim().max(2000),
});
export const cartRowSchema = z.object({
  product_id: z.uuid(),
  sku_id: z.uuid().optional(),
  sku_version: z.number().int().optional(),
  variant_snapshot: z.record(z.string(), z.string()).optional(),
  business_id: z.uuid(),
  supplier_name: z.string(),
  name: z.string(),
  name_bn: z.string(),
  unit: z.string(),
  quantity: z.number().int().positive(),
  moq: z.number(),
  stock: z.number(),
  unit_price: z.number().positive(),
  available: z.boolean(),
});
export type CartRow = z.infer<typeof cartRowSchema>;
export const cartSchema = z.object({ rows: z.array(cartRowSchema) });
export const orderSummarySchema = z.object({
  purchase_kind: z.enum(['wholesale', 'sample', 'customization']).optional(),
  id: z.uuid(),
  number: z.number(),
  supplier_name: z.string(),
  buyer_name: z.string(),
  status: z.enum(orderStates),
  payment_status: z.enum(paymentStates),
  payment_method: z.enum(['cod', 'bank_transfer']),
  total: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  cancellation_requested: z.boolean(),
});
export const orderListSchema = z.object({
  total: z.number(),
  rows: z.array(orderSummarySchema),
  counts: z.object({ open: z.number(), disputed: z.number(), refund_pending: z.number() }),
});
export const orderDetailSchema = orderSummarySchema.extend({
  purchase_kind: z.enum(['wholesale', 'sample', 'customization']).default('wholesale'),
  buyer_id: z.uuid(),
  business_id: z.uuid(),
  subtotal: z.number(),
  shipping_fee: z.number(),
  shipping_address: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    division: z.string(),
    district: z.string(),
  }),
  buyer_note: z.string(),
  supplier_note: z.string(),
  version: z.number().int(),
  expires_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.uuid(),
      product_id: z.uuid().nullable(),
      sku_id: z.uuid().nullable().optional(),
      variant_snapshot: z.record(z.string(), z.string()).optional(),
      name: z.string(),
      name_bn: z.string(),
      unit: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
      line_total: z.number(),
    }),
  ),
  events: z.array(
    z.object({
      id: z.uuid(),
      actor_role: z.string(),
      action: z.string(),
      note: z.string(),
      created_at: z.string(),
      from_status: z.string().nullable(),
      to_status: z.string().nullable(),
    }),
  ),
  shipments: z.array(
    z.object({
      id: z.uuid(),
      carrier: z.string(),
      tracking_number: z.string(),
      shipped_at: z.string(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.uuid(),
      kind: z.string(),
      amount: z.number(),
      reference: z.string(),
      created_at: z.string(),
    }),
  ),
  returns: z.array(
    z.object({
      id: z.uuid(),
      status: z.enum(['authorized', 'in_transit', 'received']),
      authorized_at: z.string(),
      carrier: z.string().nullable(),
      tracking_number: z.string().nullable(),
      dispatched_at: z.string().nullable(),
      received_at: z.string().nullable(),
      restocked: z.boolean(),
    }),
  ),
  disputes: z.array(
    z.object({
      id: z.uuid(),
      reason: z.string(),
      previous_status: z.string(),
      opened_at: z.string(),
      resolution: z.string().nullable(),
      resolution_note: z.string().nullable(),
      resolved_at: z.string().nullable(),
    }),
  ),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;
export type OrderAction =
  | 'confirm'
  | 'accept'
  | 'cancel'
  | 'request_cancel'
  | 'decline_cancel'
  | 'authorize_return'
  | 'return_ship'
  | 'return_received'
  | 'ship'
  | 'receive'
  | 'report_payment'
  | 'confirm_payment'
  | 'confirm_refund'
  | 'dispute'
  | 'resolve_cancel'
  | 'resolve_resume'
  | 'resolve_complete'
  | 'note';
export const actionSchema = z.object({
  restock: z.boolean().optional(),
  note: z.string().trim().max(2000).optional(),
  reference: z.string().trim().max(200).optional(),
  shipping_fee: z.number().min(0).max(1000000).optional(),
  carrier: z.string().trim().max(100).optional(),
  tracking_number: z.string().trim().max(120).optional(),
});
export function validateOrderAction(action: OrderAction, payload: z.infer<typeof actionSchema>) {
  const value = actionSchema.parse(payload);
  if (
    [
      'cancel',
      'request_cancel',
      'decline_cancel',
      'authorize_return',
      'return_received',
      'dispute',
      'resolve_cancel',
      'resolve_resume',
      'resolve_complete',
    ].includes(action)
  )
    z.string().min(10, 'Explain the reason in at least 10 characters').parse(value.note);
  if (['report_payment', 'confirm_payment', 'confirm_refund'].includes(action))
    z.string().min(3, 'Enter the payment or refund reference').parse(value.reference);
  if (action === 'confirm')
    z.number()
      .min(0)
      .max(1000000)
      .refine(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
        'Use at most two decimal places',
      )
      .parse(value.shipping_fee);
  if (action === 'ship' || action === 'return_ship') {
    z.string().min(2).parse(value.carrier);
    z.string().min(2).parse(value.tracking_number);
  }
  if (action === 'note') z.string().min(2).parse(value.note);
  return value;
}
export function checkoutExpected(rows: CartRow[]) {
  return [...rows]
    .sort(
      (a, b) =>
        a.product_id.localeCompare(b.product_id) || (a.sku_id ?? '').localeCompare(b.sku_id ?? ''),
    )
    .map((r) => ({
      product_id: r.product_id,
      ...(r.sku_id ? { sku_id: r.sku_id, sku_version: r.sku_version } : {}),
      quantity: r.quantity,
      unit_price: r.unit_price,
    }));
}
export function cartSubtotal(rows: CartRow[]) {
  return rows.reduce((total, r) => total + Math.round(r.quantity * r.unit_price * 100), 0) / 100;
}
