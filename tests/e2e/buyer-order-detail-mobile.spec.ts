import { test, expect } from '@playwright/test';
import { orderFixture, oid } from '../helpers/order-fixture';

test('mobile buyer detail stays compact across order states and exposes the complete progress timeline', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Explicit phone/language matrix runs once');
  for (const locale of ['en', 'bn']) {
    for (const status of [
      'pending_confirmation',
      'awaiting_acceptance',
      'processing',
      'shipped',
      'completed',
      'disputed',
      'cancelled',
    ]) {
      await orderFixture(page, { locale, status, keepExpiry: true });
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`/dashboard/orders/${oid}`);
        await expect(page.locator('.bo-status-banner')).toBeVisible();
        await expect(page.locator('.bo-action-total')).toBeVisible();
        await expect(page.locator('.order-confirmation-deadline')).toHaveCount(
          ['pending_confirmation', 'awaiting_acceptance'].includes(status) ? 1 : 0,
        );
        const toggle = page.locator('.bo-progress-toggle');
        if (!['disputed', 'cancelled'].includes(status)) {
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          await expect(page.locator('#buyer-order-progress')).toBeHidden();
          await toggle.focus();
          await page.keyboard.press('Enter');
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
          await expect(page.locator('#buyer-order-progress > li')).toHaveCount(5);
          await expect(page.locator('#buyer-order-progress [aria-current="step"]')).toBeVisible();
          await toggle.click();
          await expect(page.locator('#buyer-order-progress')).toBeHidden();
        } else await expect(toggle).toHaveCount(0);
        const print = page.locator('.order-print');
        expect((await print.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        for (const button of await page.locator('.order-action-buttons > button').all()) {
          const bounds = (await button.boundingBox())!;
          expect(bounds.height).toBeGreaterThanOrEqual(44);
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        }
        if (width === 390 && ['awaiting_acceptance', 'shipped'].includes(status)) {
          // Reset scroll after testing the timeline to verify initial action placement.
          await page.evaluate(() => window.scrollTo(0, 0));
          const button = page.locator('.order-action-buttons > button').first();
          expect((await button.boundingBox())!.y).toBeLessThan(800);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (width === 390 && status === 'awaiting_acceptance')
          await page.screenshot({
            path: `artifacts/buyer-detail-refined-${locale}.png`,
            fullPage: true,
          });
      }
    }
  }
});

test('mobile order loading and failure preserve the compact workspace header', async ({ page }) => {
  await orderFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/rpc/order_detail', async (route) => {
    await pending;
    await route.fallback();
  });
  try {
    await page.goto(`/dashboard/orders/${oid}`);
    await expect(page.locator('.bo-detail-pending')).toBeVisible();
    await expect(page.locator('.site-header .header-search')).toBeHidden();
  } finally {
    release();
  }
  await expect(page.locator('.bo-status-banner')).toBeVisible();
  await page.unroute('**/rest/v1/rpc/order_detail');
  await orderFixture(page, { fail: true });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(page.locator('.bo-detail-pending')).toBeVisible();
  await expect(page.locator('.site-header .header-search')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
