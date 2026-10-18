import { test, expect, type Page } from '@playwright/test';
import { orderFixture } from '../helpers/order-fixture';
import { bid, pid } from '../helpers/chat-fixture';
import type { CartRow } from '../../src/lib/order-schema';

async function pricingFixture(
  page: Page,
  { mixed = false, failPrices = false, locale = 'en' } = {},
) {
  const calls = await orderFixture(page, { locale });
  const second = '82000000-0000-4000-8000-000000000002';
  const prices = [
    { min_quantity: 1, price: 1950 },
    { min_quantity: 8, price: 1950 },
    { min_quantity: 24, price: 1853 },
    { min_quantity: 80, price: 1755 },
  ];
  let rows: CartRow[] = [
    {
      product_id: pid,
      sku_id: pid,
      sku_version: 1,
      business_id: bid,
      supplier_name: 'Synthetic Homeware',
      name: 'Synthetic dining chair',
      name_bn: 'পরীক্ষামূলক চেয়ার',
      unit: 'piece',
      quantity: mixed ? 4 : 8,
      moq: 8,
      stock: 1000,
      unit_price: 1950,
      available: true,
      variant_snapshot: mixed ? { Colour: 'Green' } : {},
    },
  ];
  if (mixed)
    rows.push({
      ...rows[0],
      sku_id: second,
      quantity: 4,
      unit_price: 2050,
      variant_snapshot: { Colour: 'Cream' },
    });
  await page.route('**/rest/v1/rpc/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const body = route.request().postDataJSON() ?? {};
    if (name === 'cart_quote') return route.fulfill({ json: { rows } });
    if (name === 'product_options') {
      if (failPrices)
        return route.fulfill({ status: 503, json: { message: 'Prices temporarily unavailable' } });
      return route.fulfill({
        json: {
          sourcing: {
            product_id: pid,
            preparation_min: 1,
            preparation_max: 7,
            dispatch_location: '',
            packaging: '',
            delivery_notes: '',
            samples_enabled: false,
            sample_limit: 1,
            customization_enabled: false,
            customization_moq: 8,
            estimates_updated_at: null,
            version: 1,
          },
          attributes: mixed ? [{ name: 'Colour', values: ['Green', 'Cream'] }] : [],
          skus: rows.map((row) => ({
            id: row.sku_id,
            code: row.sku_id,
            active: true,
            stock: 1000,
            image_id: null,
            version: 1,
            options: row.variant_snapshot,
            prices: prices.map((p) => ({
              ...p,
              price: p.price + (row.sku_id === second ? 100 : 0),
            })),
          })),
        },
      });
    }
    if (name === 'cart_skus_set') {
      const selections = body.selections as { sku_id: string; quantity: number }[];
      const total = selections.reduce((sum, line) => sum + line.quantity, 0);
      if (selections.length && total < 8)
        return route.fulfill({
          status: 400,
          json: { message: 'Combined quantity must meet product MOQ' },
        });
      rows = rows.flatMap((row) => {
        const line = selections.find((line) => line.sku_id === row.sku_id);
        return line
          ? [
              {
                ...row,
                quantity: line.quantity,
                unit_price:
                  prices.filter((p) => p.min_quantity <= total).at(-1)!.price +
                  (row.sku_id === second ? 100 : 0),
              },
            ]
          : [];
      });
      return route.fulfill({ json: null });
    }
    return route.fallback();
  });
  return {
    calls,
    recover: () => {
      failPrices = false;
    },
  };
}

test('cart shows all real tiers and applies exact boundaries in both directions', async ({
  page,
}, info) => {
  const { calls } = await pricingFixture(page);
  await page.goto('/cart');
  const item = page.locator('.order-cart-item');
  await expect(item.locator('.cart-tier-grid > button')).toHaveCount(3);
  await expect(item.locator('.is-applied')).toContainText('8 pieces+');
  for (const [quantity, price, tier] of [
    [23, 1950, 8],
    [24, 1853, 24],
    [79, 1853, 24],
    [80, 1755, 80],
    [8, 1950, 8],
  ]) {
    await item.getByRole('spinbutton').fill(String(quantity));
    await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'true');
    await item.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute(
      'aria-disabled',
      'false',
    );
    await expect(item.locator('.is-applied')).toContainText(`${tier} pieces+`);
    await expect(item.locator('.cart-line-total')).toContainText(
      new Intl.NumberFormat('en-BD').format(quantity * price),
    );
  }
  await item.getByRole('spinbutton').fill('24');
  await item.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(item.locator('.cart-line-total')).toContainText('44,472');
  await page.screenshot({
    path: `artifacts/cart-pricing-${info.project.name}.png`,
    fullPage: true,
  });
  await page.locator('.cart-checkout-actions a').click();
  await expect(page).toHaveURL('/checkout');
  await expect(page.locator('.checkout-line')).toContainText('44,472');
  await page
    .getByRole('textbox', { name: 'Recipient name', exact: true })
    .fill('Synthetic Receiver');
  await page.getByRole('textbox', { name: 'Mobile number', exact: true }).fill('01712345678');
  await page
    .getByRole('textbox', { name: 'Street address and delivery instructions' })
    .fill('10 Synthetic Road Dhaka');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Place order request', exact: true }).click();
  await expect
    .poll(() => calls.find((c) => c.name === 'order_checkout')?.body.expected)
    .toEqual([{ product_id: pid, sku_id: pid, sku_version: 1, quantity: 24, unit_price: 1853 }]);
});

test('combined variant quantities unlock distinct SKU prices and preserve sibling drafts', async ({
  page,
}) => {
  await pricingFixture(page, { mixed: true });
  await page.goto('/cart');
  const first = page.locator('.order-cart-item').first();
  const second = page.locator('.order-cart-item').nth(1);
  await expect(second.locator('.is-applied')).toContainText('2,050');
  await second.getByRole('spinbutton').fill('6');
  await first.getByRole('spinbutton').fill('20');
  await first.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(first.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
  await expect(first.locator('.is-applied')).toContainText('1,853');
  await expect(second.locator('.is-applied')).toContainText('1,953');
  await expect(first.locator('.cart-combined-quantity')).toContainText('26 pieces');
  await expect(second.getByRole('spinbutton')).toHaveValue('6');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'true');
  await second.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
  await expect(first.locator('.cart-combined-quantity')).toContainText('26 pieces');
});

test('tier failure is recoverable and never invents prices', async ({ page }) => {
  const { recover } = await pricingFixture(page, { failPrices: true });
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: 'Retry prices' })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.cart-tier-grid')).toHaveCount(0);
  await expect(page.locator('.cart-line-total')).toContainText('15,600');
  recover();
  await page.getByRole('button', { name: 'Retry prices' }).click();
  await expect(page.locator('.cart-tier-grid > button')).toHaveCount(3);
});

test('tier prices fit narrow Bangla screens without overflow', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Viewport matrix runs once.');
  await pricingFixture(page, { locale: 'bn', mixed: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/cart');
    await expect(page.locator('.cart-tier-grid').first().locator('> button')).toHaveCount(3);
    await expect(page.locator('.is-applied').first()).toContainText('প্রযোজ্য মূল্য');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 390)
      await page.screenshot({ path: 'artifacts/cart-pricing-bn-390.png', fullPage: true });
  }
});

test('removing a mixed variant below MOQ offers deliberate whole-product removal', async ({
  page,
}) => {
  await pricingFixture(page, { mixed: true });
  await page.goto('/cart');
  const first = page.locator('.order-cart-item').first();
  await first.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(first.getByRole('group', { name: 'Remove all variants' })).toBeVisible();
  await first.getByRole('button', { name: 'Keep items' }).click();
  await expect(page.locator('.order-cart-item')).toHaveCount(2);
  await first.getByRole('button', { name: 'Remove', exact: true }).click();
  await first.getByRole('button', { name: 'Remove all variants' }).click();
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
});

test('changed price schedules can refresh without changing quantities', async ({ page }) => {
  await pricingFixture(page);
  let refreshed = false;
  await page.route('**/rpc/cart_quote', (route) =>
    route.fulfill({
      json: {
        rows: [
          {
            product_id: pid,
            sku_id: pid,
            sku_version: 1,
            business_id: bid,
            supplier_name: 'Synthetic Homeware',
            name: 'Synthetic chair',
            name_bn: '',
            unit: 'piece',
            quantity: 8,
            moq: 8,
            stock: 1000,
            unit_price: refreshed ? 1950 : 2000,
            available: true,
          },
        ],
      },
    }),
  );
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: 'Refresh prices' })).toBeVisible();
  await expect(page.locator('.is-applied')).toHaveCount(0);
  refreshed = true;
  await page.getByRole('button', { name: 'Refresh prices' }).click();
  await expect(page.locator('.is-applied')).toContainText('1,950');
  await expect(page.locator('.cart-line-total')).toContainText('15,600');
});

test('mobile quantity and price update together and save without tapping Update', async ({
  page,
}) => {
  await pricingFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cart');
  const item = page.locator('.order-cart-item');
  await expect(item.locator('.cart-tier-grid button')).toHaveCount(3);
  await expect(item.locator('.cart-tier-grid')).not.toContainText('1 piece+');
  await item.getByRole('spinbutton').fill('24');
  await expect(item.locator('.cart-line-total')).toContainText('44,472');
  await expect(page.locator('.cart-mobile-subtotal')).toContainText('44,472');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
  await expect(item.getByRole('spinbutton')).toBeFocused();
  await page.reload();
  await expect(item.getByRole('spinbutton')).toHaveValue('24');
  await expect(item.locator('.cart-line-total')).toContainText('44,472');
  await item.getByRole('button', { name: 'Apply quantity tier: 80 pieces', exact: true }).click();
  await expect(item.getByRole('spinbutton')).toHaveValue('80');
  await expect(item.locator('.cart-line-total')).toContainText('140,400');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
  await item.getByRole('button', { name: 'Decrease quantity', exact: true }).click();
  await expect(item.locator('.cart-line-total')).toContainText('146,387');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
  await page.reload();
  await expect(item.getByRole('spinbutton')).toHaveValue('79');
  await item.getByRole('spinbutton').fill('7');
  await expect(item.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
  await expect(item.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled();
  await item.getByRole('button', { name: 'Discard changes' }).click();
  await expect(item.getByRole('spinbutton')).toHaveValue('79');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
  await item.getByRole('spinbutton').fill('7');
  await item.getByRole('button', { name: 'Apply quantity tier: 8 pieces', exact: true }).click();
  await expect(item.getByRole('spinbutton')).toHaveValue('8');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
});

test('automatic save failure does not retry forever and can be retried or discarded', async ({
  page,
}) => {
  await pricingFixture(page);
  let fail = true;
  let updates = 0;
  await page.route('**/rpc/cart_skus_set', async (route) => {
    updates++;
    if (fail)
      return route.fulfill({ status: 409, json: { message: 'Stock changed. Please retry.' } });
    return route.fallback();
  });
  await page.goto('/cart');
  const item = page.locator('.order-cart-item');
  await item.getByRole('spinbutton').fill('24');
  await expect(item.getByRole('alert')).toContainText('Stock changed');
  await expect(
    page.getByText('Changes were not saved. Retry Update or discard changes.'),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  expect(updates).toBe(1);
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'true');
  fail = false;
  await item.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
  await page.reload();
  await expect(item.getByRole('spinbutton')).toHaveValue('24');
});

test('typing during an in-flight save keeps focus and persists the latest quantity', async ({
  page,
}) => {
  await pricingFixture(page);
  await page.route('**/rpc/cart_skus_set', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return route.fallback();
  });
  await page.goto('/cart');
  const item = page.locator('.order-cart-item');
  const input = item.getByRole('spinbutton');
  await input.fill('24');
  await expect(item.getByRole('button', { name: 'Saving…', exact: true })).toBeVisible();
  await input.fill('80');
  await expect(input).toBeFocused();
  await expect(item.locator('.cart-line-total')).toContainText('140,400');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false', {
    timeout: 15000,
  });
  await expect(input).toBeFocused();
  await page.reload();
  await expect(item.getByRole('spinbutton')).toHaveValue('80');
});

test('returning to the original quantity during a save does not lose the newest edit', async ({
  page,
}) => {
  await pricingFixture(page);
  await page.route('**/rpc/cart_skus_set', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return route.fallback();
  });
  await page.goto('/cart');
  const item = page.locator('.order-cart-item');
  const input = item.getByRole('spinbutton');
  await input.fill('24');
  await expect(item.getByRole('button', { name: 'Saving…', exact: true })).toBeVisible();
  await input.fill('8');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false', {
    timeout: 15000,
  });
  await expect(input).toHaveValue('8');
  await expect(item.locator('.cart-line-total')).toContainText('15,600');
  await page.reload();
  await expect(item.getByRole('spinbutton')).toHaveValue('8');
});
