import { test, expect } from '@playwright/test';
import { orderFixture, oid } from '../helpers/order-fixture';

test('buyer order filters, cards, actions and sheets fit mobile English and Bangla', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Explicit viewport matrix runs once');
  for (const locale of ['en', 'bn']) {
    const calls = await orderFixture(page, { locale });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/dashboard/orders');
      await expect(page.locator('.bo-order-card')).toBeVisible();
      const filters = page.locator('.order-filters');
      await expect(filters.locator('select').first()).toBeHidden();
      await expect(page.locator('.site-header .header-search')).toBeHidden();
      if (width === 390)
        expect((await page.locator('.bo-order-card').first().boundingBox())!.y).toBeLessThan(550);
      await page.locator('.bo-filter-toggle').click();
      await expect(page.locator('.bo-filter-toggle')).toHaveAttribute('aria-expanded', 'true');
      for (const input of await filters.locator('input, select').all()) {
        expect(
          await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        ).toBeGreaterThanOrEqual(16);
        expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      await filters.locator('input').fill('PK-000101');
      await filters.locator('.bo-search-submit').click();
      await expect
        .poll(() => calls.filter((c) => c.name === 'order_list').at(-1)?.body.search)
        .toBe('PK-000101');
      await filters.locator('select').last().selectOption('50');
      await expect
        .poll(() => calls.filter((c) => c.name === 'order_list').at(-1)?.body.page_size)
        .toBe(50);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.locator('.bo-filter-toggle').click();
      await expect(filters.locator('select').first()).toBeHidden();
      if (width === 390)
        await page.screenshot({
          path: `artifacts/buyer-orders-mobile-list-${locale}.png`,
          fullPage: true,
        });
      await page.locator('.bo-view-order').click();
      await expect(page).toHaveURL(`/dashboard/orders/${oid}`);
      const actions = page.locator('.order-actions-panel');
      const items = page.locator('.order-detail-grid > div');
      const payment = page.locator('.order-detail-grid > aside > section').last();
      await expect(actions).toBeVisible();
      expect((await actions.boundingBox())!.y).toBeLessThan((await items.boundingBox())!.y);
      expect((await payment.boundingBox())!.y).toBeGreaterThan((await items.boundingBox())!.y);
      for (const button of await actions.locator('button').all())
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (width === 390)
        await page.screenshot({
          path: `artifacts/buyer-orders-mobile-detail-${locale}.png`,
          fullPage: true,
        });
      await actions.locator('button').first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(845);
      for (const button of await dialog.locator('footer button').all())
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (width === 390)
        await page.screenshot({ path: `artifacts/buyer-orders-mobile-dialog-${locale}.png` });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
});
