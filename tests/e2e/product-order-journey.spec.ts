import { test, expect } from '@playwright/test';
import { orderFixture, oid } from '../helpers/order-fixture';
import { bid, pid } from '../helpers/chat-fixture';
import type { CartRow } from '../../src/lib/order-schema';

// Stateful browser-only boundary: verify SKU payloads survive page transitions.
// Real transaction/ownership checks run separately in the rolled-back SQL suite.
test('buyer carries SKU quantities from product through cart and COD checkout', async ({
  page,
}) => {
  const calls = await orderFixture(page, { status: 'pending_confirmation' });
  let rows: CartRow[] = [];
  const selections: unknown[] = [];
  await page.route('**/rest/v1/rpc/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const body = route.request().postDataJSON() ?? {};
    if (name === 'cart_quote') return route.fulfill({ json: { rows } });
    if (name === 'cart_skus_set') {
      selections.push(body);
      rows = body.selections.map((line: { sku_id: string; quantity: number }) => ({
        product_id: pid,
        sku_id: line.sku_id,
        sku_version: 1,
        variant_snapshot: {},
        business_id: bid,
        supplier_name: 'Synthetic Textile Works',
        name: 'Synthetic cotton shirt',
        name_bn: 'পরীক্ষামূলক সুতি শার্ট',
        unit: 'piece',
        quantity: line.quantity,
        moq: 100,
        stock: 5000,
        unit_price: 185,
        available: true,
      }));
      return route.fulfill({ json: null });
    }
    if (name === 'order_checkout') rows = [];
    return route.fallback();
  });
  await page.goto(`/products/${pid}`);
  await expect(page.getByRole('spinbutton', { name: 'Order quantity', exact: true })).toHaveValue(
    '100',
  );
  await page.locator('.pd-main-buy').click();
  await expect(page).toHaveURL('/cart');
  await expect(page.locator('.order-cart-item')).toHaveCount(1);
  await expect(page.locator('.order-cart-item')).toContainText('Synthetic cotton shirt');
  await page.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('200');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.locator('.order-cart-item')).toContainText('37,000');
  await page.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('100');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.locator('.order-cart-item')).toContainText('18,500');
  await page.locator('a[href="/checkout"]').click();
  await expect(page).toHaveURL('/checkout');
  await page
    .getByRole('textbox', { name: 'Recipient name', exact: true })
    .fill('Synthetic Receiver');
  await page.getByRole('textbox', { name: 'Mobile number', exact: true }).fill('01712345678');
  await page
    .getByRole('textbox', { name: 'Street address and delivery instructions' })
    .fill('10 Synthetic Road Dhaka');
  await page.getByRole('radio', { name: /Cash on delivery/ }).check();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Place order request', exact: true }).click();
  await expect(page).toHaveURL(`/dashboard/orders/${oid}`);
  const checkout = calls.find((c) => c.name === 'order_checkout')!.body;
  expect(checkout.method).toBe('cod');
  expect(checkout.expected).toEqual([
    { product_id: pid, sku_id: pid, sku_version: 1, quantity: 100, unit_price: 185 },
  ]);
  expect(selections).toHaveLength(3);
  await expect(page.locator('.order-totals')).toContainText('18,500');
  await expect(page.getByRole('button', { name: 'Accept final total', exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole('navigation', { name: 'Dashboard navigation' })
    .getByRole('link', { name: 'Cart', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your cart is empty', exact: true }),
  ).toBeVisible();
});
