import { z } from 'zod';
import { db } from './supabase';
import {
  cartSchema,
  checkoutSchema,
  checkoutExpected,
  orderDetailSchema,
  orderListSchema,
  validateOrderAction,
  type CartRow,
  type OrderAction,
} from './order-schema';
export async function cartQuote() {
  const { data, error } = await db().rpc('cart_quote');
  if (error) throw error;
  return cartSchema.parse(data);
}
export async function setCart(product: string, quantity: number) {
  z.uuid().parse(product);
  z.number().int().min(0).max(1000000).parse(quantity);
  const { error } = await db().rpc('cart_set', { product, quantity });
  if (error) throw error;
}
export async function checkout(
  nonce: string,
  input: z.infer<typeof checkoutSchema>,
  rows: CartRow[],
) {
  const parsed = checkoutSchema.parse(input);
  const { data, error } = await db().rpc('order_checkout', {
    nonce: z.uuid().parse(nonce),
    ...parsed,
    expected: checkoutExpected(rows),
  });
  if (error) throw error;
  return z.object({ ids: z.array(z.uuid()) }).parse(data);
}
export async function listOrders(search = '', state = '', page = 1, page_size = 25) {
  const { data, error } = await db().rpc('order_list', { search, state, page, page_size });
  if (error) throw error;
  return orderListSchema.parse(data);
}
export async function getOrder(target: string) {
  const { data, error } = await db().rpc('order_detail', { target: z.uuid().parse(target) });
  if (error) throw error;
  return orderDetailSchema.parse(data);
}
export async function actOnOrder(
  target: string,
  expected_version: number,
  action: OrderAction,
  payload: Parameters<typeof validateOrderAction>[1],
) {
  const { data, error } = await db().rpc('order_action', {
    target: z.uuid().parse(target),
    expected_version,
    action,
    payload: validateOrderAction(action, payload),
  });
  if (error) throw error;
  return orderDetailSchema.parse(data);
}

export function formatOrderDate(value: string, locale: 'en' | 'bn') {
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
