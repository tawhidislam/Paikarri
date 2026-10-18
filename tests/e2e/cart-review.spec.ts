import { test, expect } from '@playwright/test';
import { orderFixture } from '../helpers/order-fixture';
import { bid, pid } from '../helpers/chat-fixture';

test('discarding a failed quantity edit clears the obsolete error', async ({ page }) => {
  await orderFixture(page);
  await page.route('**/rpc/cart_set', (route) =>
    route.fulfill({ status: 409, json: { message: 'Synthetic stock conflict' } }),
  );
  await page.goto('/cart');
  await page.getByRole('spinbutton').fill('500');
  await expect(page.getByRole('alert')).toContainText('Synthetic stock conflict');
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('spinbutton')).toHaveValue('100');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
});

test('summary counts distinct products when multiple variants are selected', async ({ page }) => {
  await orderFixture(page);
  await page.route('**/rpc/cart_quote', (route) =>
    route.fulfill({
      json: {
        rows: [1, 2].map((n) => ({
          product_id: pid,
          sku_id: `82000000-0000-4000-8000-00000000000${n}`,
          business_id: bid,
          supplier_name: 'Synthetic Textile Works',
          name: 'Synthetic shirt',
          name_bn: '',
          variant_snapshot: { Size: n === 1 ? 'Medium' : 'Large' },
          unit: 'piece',
          quantity: 50,
          moq: 100,
          stock: 1000,
          unit_price: 185,
          available: true,
        })),
      },
    }),
  );
  await page.goto('/cart');
  await expect(page.locator('.order-cart-item')).toHaveCount(2);
  await expect(
    page
      .locator('.order-summary dl > div')
      .filter({ has: page.getByText('Products', { exact: true }) })
      .locator('dd'),
  ).toHaveText('1');
});

test('mobile quantity is above the checkout bar and checkout inputs stay readable', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'The viewport/language matrix runs once.');
  for (const locale of ['en', 'bn']) {
    await orderFixture(page, { locale });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/cart');
      await expect(page.locator('.cart-tier-grid button')).toHaveCount(2);
      await expect(page.locator('main h1')).toHaveCount(1);
      await expect(page.locator('.cart-item-thumbnail')).toHaveCount(1);
      await page.evaluate(async () => {
        await document.fonts.ready;
        scrollTo(0, 0);
      });
      if (width <= 600) {
        const input = await page.getByRole('spinbutton').boundingBox();
        const bar = await page.locator('.cart-checkout-actions').boundingBox();
        expect(input!.y + input!.height).toBeLessThan(bar!.y);
        expect(
          await page.getByRole('spinbutton').evaluate((el) => {
            const r = el.getBoundingClientRect();
            return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
          }),
        ).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width === 390)
        await page.screenshot({ path: `artifacts/cart-fixed-${locale}-390.png`, fullPage: true });
      await page.locator('.cart-checkout-actions a').click();
      await expect(page.locator('.checkout-page')).toBeVisible();
      await expect(page.locator('main h1')).toHaveCount(1);
      if (width <= 800) {
        for (const field of await page
          .locator(
            '.checkout-page .field input,.checkout-page .field select,.checkout-page .field textarea',
          )
          .all()) {
          expect(
            await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
          ).toBeGreaterThanOrEqual(16);
        }
        await expect(page.locator('.chat-launcher')).not.toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width === 390)
        await page.screenshot({
          path: `artifacts/checkout-fixed-${locale}-390.png`,
          fullPage: true,
        });
    }
  }
});

test('cart uses a SKU thumbnail and falls back gracefully for a broken image', async ({ page }) => {
  await orderFixture(page);
  await page.route('**/rest/v1/product_images*', (route) =>
    route.fulfill({
      json: [{ id: pid, product_id: pid, path: 'synthetic/chair.png', position: 0 }],
    }),
  );
  await page.route('**/storage/v1/object/sign/product-images/**', (route) =>
    route.fulfill({
      json: { signedURL: '/object/sign/product-images/synthetic/chair.png?token=synthetic' },
    }),
  );
  await page.route(
    '**/storage/v1/object/sign/product-images/synthetic/chair.png?token=synthetic',
    (route) => route.fulfill({ status: 404, body: 'Synthetic missing image' }),
  );
  await page.goto('/cart');
  await expect(page.locator('.cart-item-thumbnail .image-placeholder')).toBeVisible();
  await expect(page.getByRole('spinbutton')).toHaveValue('100');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
});
