import { test, expect } from '@playwright/test';
import { orderFixture } from '../helpers/order-fixture';
import { bid, pid } from '../helpers/chat-fixture';
import type { CartRow } from '../../src/lib/order-schema';

const syntheticRow: CartRow = {
  product_id: pid,
  business_id: bid,
  supplier_name: 'Synthetic supplier with a long registered business name',
  name: 'Synthetic wholesale cotton shirt with extended product specifications and packaging',
  name_bn: 'পরীক্ষামূলক পাইকারি সুতি শার্ট — প্যাকেজিং ও মাপের বিবরণ',
  unit: 'piece',
  quantity: 100,
  moq: 100,
  stock: 1000,
  unit_price: 185,
  available: true,
};

test('cart layouts fit phones through desktop in English and Bangla', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Viewport and locale matrix runs once.');
  for (const locale of ['en', 'bn']) {
    await orderFixture(page, { locale, twoSuppliers: true });
    for (const width of [320, 390, 600, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/cart');
      await expect(page.locator('.order-cart-item')).toHaveCount(2);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      for (const locator of [
        page.locator('.cart-quantity-stepper button').first(),
        page.locator('.order-cart-quantity > button').first(),
      ]) {
        const box = await locator.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      const input = page.getByRole('spinbutton').first();
      expect(
        await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      const bar = page.locator('.cart-checkout-actions');
      if (width <= 600) {
        const box = await bar.boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(845);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        await expect(page.locator('.chat-launcher')).not.toBeVisible();
        expect(
          await page.locator('.cart-checkout-actions a').evaluate((el) => {
            const r = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
          }),
        ).toBe(true);
        await page.locator('.site-footer').scrollIntoViewIfNeeded();
        expect(
          (await bar.boundingBox())!.y + (await bar.boundingBox())!.height,
        ).toBeLessThanOrEqual(845);
      }
      if ([390, 1440].includes(width)) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `artifacts/cart-${locale}-${width}.png`, fullPage: true });
      }
    }
  }
});

test('mobile stepper, invalid input and saved tier totals work without stale checkout', async ({
  page,
}) => {
  const calls = await orderFixture(page);
  await page.setViewportSize({ width: 390, height: 650 });
  await page.goto('/cart');
  const item = page.locator('.order-cart-item');
  const input = item.getByRole('spinbutton');
  const update = item.getByRole('button', { name: 'Update', exact: true });
  await item.getByRole('button', { name: 'Increase quantity' }).click();
  await expect(input).toHaveValue('101');
  await item.getByRole('button', { name: 'Decrease quantity' }).click();
  await expect(update).toBeDisabled();
  for (const value of ['', '0', '1001', '1.5']) {
    await input.fill(value);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(update).toBeDisabled();
  }
  expect(calls.filter((c) => c.name === 'cart_set')).toHaveLength(0);
  await input.fill('500');
  await expect(page.getByText('Saving quantity and prices automatically…')).toBeVisible();
  await page.route('**/rpc/cart_set', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fallback();
  });
  await update.click();
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.cart-line-total')).toContainText('85,000');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
  expect(calls.find((c) => c.name === 'cart_set')?.body.quantity).toBe(500);
  await page.locator('.cart-checkout-actions a').click();
  await expect(page).toHaveURL('/checkout');
});

test('SKU selections, long names and failed saves retain the editable cart', async ({ page }) => {
  await orderFixture(page);
  const sku1 = '82000000-0000-4000-8000-000000000001';
  const sku2 = '82000000-0000-4000-8000-000000000002';
  let rows: CartRow[] = [
    {
      ...syntheticRow,
      sku_id: sku1,
      quantity: 50,
      variant_snapshot: { Colour: 'Forest green', Size: 'Medium' },
    },
    {
      ...syntheticRow,
      sku_id: sku2,
      quantity: 50,
      variant_snapshot: { Colour: 'Cream', Size: 'Large' },
    },
  ];
  let fail = true;
  const selections: unknown[] = [];
  await page.route('**/rest/v1/rpc/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (name === 'cart_quote') return route.fulfill({ json: { rows } });
    if (name === 'cart_skus_set') {
      const body = route.request().postDataJSON();
      selections.push(body.selections);
      if (fail)
        return route.fulfill({ status: 409, json: { message: 'Stock changed. Please retry.' } });
      rows = rows.map((r) => ({
        ...r,
        quantity: body.selections.find((s: { sku_id: string }) => s.sku_id === r.sku_id).quantity,
      }));
      return route.fulfill({ json: null });
    }
    return route.fallback();
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/cart');
  const first = page.locator('.order-cart-item').first();
  await expect(first).toContainText('Forest green');
  await first.getByRole('spinbutton').fill('60');
  await first.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(first.getByRole('alert')).toContainText('Stock changed');
  await expect(first.getByRole('spinbutton')).toHaveValue('60');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  fail = false;
  await first.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(first.getByRole('spinbutton')).toHaveValue('60');
  await expect(first.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
  expect(selections.at(-1)).toEqual([
    { sku_id: sku1, quantity: 60 },
    { sku_id: sku2, quantity: 50 },
  ]);
});

test('unavailable items and suspended accounts cannot continue to checkout', async ({ page }) => {
  await orderFixture(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.route('**/rpc/cart_quote', (route) =>
    route.fulfill({ json: { rows: [{ ...syntheticRow, available: false }] } }),
  );
  await page.goto('/cart');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'true');
  await page.locator('.cart-checkout-actions a').press('Enter');
  await expect(page).toHaveURL('/cart');
  await expect(page.getByText('Update or remove unavailable items to continue.')).toBeVisible();
  await page.route('**/rpc/get_account_status', (route) =>
    route.fulfill({ json: { status: 'suspended', reason: 'Synthetic account review' } }),
  );
  await page.route('**/rpc/cart_quote', (route) =>
    route.fulfill({ json: { rows: [syntheticRow] } }),
  );
  await page.reload();
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'true');
  await expect(
    page.getByText('Purchasing is unavailable while your account is suspended.'),
  ).toBeVisible();
});

test('empty cart and loading failure offer usable mobile recovery', async ({ page }) => {
  await orderFixture(page);
  await page.setViewportSize({ width: 320, height: 568 });
  let failed = true;
  await page.route('**/rpc/cart_quote', (route) =>
    route.fulfill(
      failed
        ? { status: 503, json: { message: 'Cart temporarily unavailable' } }
        : { json: { rows: [] } },
    ),
  );
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible({
    timeout: 20000,
  });
  failed = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  await expect(page.locator('.cart-checkout-actions')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Browse products', exact: true })).toHaveAttribute(
    'href',
    '/products',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
