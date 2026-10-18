import { test, expect } from '@playwright/test';
import { orderFixture, oid } from '../helpers/order-fixture';

test('buyer cards and status filters use real list payloads and navigate to review', async ({
  page,
}, info) => {
  const calls = await orderFixture(page);
  await page.goto('/dashboard/orders');
  await expect(
    page.getByRole('heading', {
      name: info.project.name === 'mobile' ? 'My orders' : 'Your orders, all in one place.',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.bo-order-card')).toHaveCount(1);
  await expect(page.locator('.bo-card-total')).toContainText('19,000');
  await expect(page.locator('.bo-order-card')).toContainText('Synthetic Textile Works');
  const filters = page.getByRole('navigation', { name: 'Filter orders by status' });
  await filters.getByRole('button', { name: 'Shipped', exact: true }).click();
  await expect
    .poll(() => calls.filter((c) => c.name === 'order_list').at(-1)?.body.state)
    .toBe('shipped');
  await expect(filters.getByRole('button', { name: 'Shipped', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await filters.getByRole('button', { name: 'All orders', exact: true }).click();
  await expect(filters.getByRole('button', { name: 'All orders', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.chat-launcher')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/buyer-orders-list-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Review order', exact: true }).click();
  await expect(page).toHaveURL(`/dashboard/orders/${oid}`);
  await expect(page.getByRole('region', { name: 'Current order status' })).toContainText(
    'Your final total is ready.',
  );
  await expect(page.getByRole('button', { name: 'Accept final total', exact: true })).toBeVisible();
});

test('buyer detail stays readable in both languages and surfaces actions before items on phones', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Viewport/language matrix runs once');
  for (const locale of ['en', 'bn']) {
    await orderFixture(page, { locale });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/dashboard/orders/${oid}`);
      await expect(page.locator('.bo-status-banner')).toBeVisible();
      await expect(page.locator('.chat-launcher')).toBeHidden();
      await expect(page.locator('.order-actions-panel')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width < 700) {
        const action = await page.locator('.order-actions-panel').boundingBox();
        const items = await page
          .locator('.order-detail-grid > div > .order-panel')
          .first()
          .boundingBox();
        expect(action!.y).toBeLessThan(items!.y);
      }
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `artifacts/buyer-order-detail-${locale}-${width}.png`,
          fullPage: true,
        });
    }
  }
});

test('supplier and platform order views retain their operational layout', async ({ page }) => {
  await orderFixture(page, { role: 'supplier' });
  await page.goto('/dashboard/orders');
  await expect(page.locator('.order-table')).toBeVisible();
  await expect(page.locator('.bo-page')).toHaveCount(0);
});
