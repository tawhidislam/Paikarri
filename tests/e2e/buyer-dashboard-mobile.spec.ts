import { test, expect } from '@playwright/test';
import { orderFixture } from '../helpers/order-fixture';

test('buyer workspace supports narrow screens, expanded navigation and keyboard dismissal in both languages', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Explicit viewport matrix runs once');
  for (const locale of ['en', 'bn']) {
    await orderFixture(page, { locale });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/dashboard');
      const root = page.locator('.buyer-dashboard');
      await expect(root.locator('.buyer-quick-actions')).toBeVisible();
      await expect(root.locator('a.stat-card')).toHaveCount(4);
      const nav = page.locator('#workspace-navigation');
      const button = page.locator('.buyer-mobile-heading button');
      if (width <= 800) {
        await expect(page.locator('.chat-launcher')).toBeHidden();
        await expect(page.locator('.site-header .header-search')).toBeHidden();
        expect((await page.locator('.header-main').boundingBox())!.height).toBe(64);
        const actions = await root.locator('.buyer-quick-actions').boundingBox();
        const summary = await root.locator('.stat-grid').boundingBox();
        expect(actions!.y + actions!.height).toBeLessThan(summary!.y);
        if (width === 390) expect(summary!.y + summary!.height).toBeLessThanOrEqual(844);
        await expect(button).toHaveAttribute('aria-expanded', 'false');
        await expect(nav.locator('a[href="/dashboard/settings"]')).toBeHidden();
        for (const link of await nav.locator('.workspace-primary').all()) {
          await expect(link).toBeVisible();
          const box = await link.boundingBox();
          expect(box!.height).toBeGreaterThanOrEqual(44);
          expect(box!.width).toBeGreaterThanOrEqual(44);
          expect(
            await link.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
          ).toBeGreaterThanOrEqual(12);
        }
        await button.click();
        const sheet = page.getByRole('dialog', {
          name: locale === 'bn' ? 'আপনার কর্মক্ষেত্র' : 'Your workspace',
        });
        await expect(sheet).toBeVisible();
        await expect(sheet.locator('.workspace-menu-footer a')).toHaveText(
          locale === 'bn' ? 'সাহায্য ও সহায়তা' : 'Help & support',
        );
        if (width === 390)
          await page.screenshot({ path: `artifacts/workspace-menu-${locale}.png` });
        await expect(sheet.locator('a[href="/dashboard/settings"]')).toBeVisible();
        await expect(sheet.locator('.workspace-menu-signout')).toBeVisible();
        await sheet.locator('a[href="/dashboard/settings"]').focus();
        await page.keyboard.press('Escape');
        await expect(button).toBeFocused();
        await expect(button).toHaveAttribute('aria-expanded', 'false');
        await button.click();
        await page.locator('.buyer-workspace-dialog a[href="/dashboard/quotations"]').click();
        await expect(page).toHaveURL('/dashboard/quotations');
        await expect(button).toHaveAttribute('aria-expanded', 'false');
        await nav.locator('a[href="/dashboard"]').click();
      } else {
        await expect(button).toBeHidden();
        await expect(nav.locator('a[href="/dashboard/settings"]')).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width === 390)
        await page.screenshot({
          path: `artifacts/buyer-dashboard-mobile-${locale}.png`,
          fullPage: true,
        });
      await nav.locator('a[href="/cart"]').click();
      await expect(page).toHaveURL('/cart');
    }
  }
});

test('supplier workspace retains its own navigation', async ({ page }) => {
  await orderFixture(page, { role: 'supplier' });
  await page.goto('/dashboard');
  await expect(page.locator('.buyer-mobile-heading')).toHaveCount(0);
  await expect(page.locator('.dashboard-sidebar a[href="/dashboard/products"]')).toBeVisible();
});

test('buyer account form fits phones without zoom-sized inputs or overflow', async ({ page }) => {
  await orderFixture(page);
  await page.route('**/rest/v1/profiles?**', (route) =>
    route.fulfill({
      json: {
        id: '190b6f2a-5dd6-44f3-ae10-3a9a567d7fb5',
        full_name: 'Synthetic buyer',
        phone: '',
        avatar_path: null,
        updated_at: '2026-10-17T00:00:00Z',
      },
    }),
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/dashboard/settings');
  const form = page.locator('.dashboard-content form');
  await expect(form.locator('input[type="tel"]')).toBeVisible();
  for (const input of await form.locator('input:not([type="file"])').all()) {
    expect(
      await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(form.getByRole('button', { name: 'Save profile' })).toBeVisible();
});

test('buyer summary keeps loading, retry and actual count responses functional', async ({
  page,
}) => {
  await orderFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fail = true;
  const counts: Record<string, number> = {
    favorites: 12,
    saved_suppliers: 8,
    quotation_requests: 3,
    conversations: 5,
  };
  await page.route('**/rest/v1/*', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').pop()!;
    if (route.request().method() !== 'HEAD' || !(table in counts)) return route.fallback();
    await pending;
    // Use a non-retryable SDK response to exercise the dashboard's own retry UI.
    if (fail) return route.fulfill({ status: 400, json: { message: 'Summary unavailable' } });
    return route.fulfill({
      status: 200,
      headers: {
        'content-range': `*/${counts[table]}`,
        'access-control-expose-headers': 'content-range',
      },
      body: '',
    });
  });
  try {
    await page.goto('/dashboard');
    await expect(page.locator('.workspace-skeleton')).toHaveCount(4);
    await expect(page.locator('.buyer-quick-actions')).toBeVisible();
  } finally {
    release();
  }
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  for (const [path, count] of [
    ['favorites', '12'],
    ['suppliers', '8'],
    ['quotations', '3'],
    ['messages', '5'],
  ]) {
    await expect(page.locator(`.stat-card[href="/dashboard/${path}"] > strong`)).toHaveText(count);
  }
  await expect(page.locator('.workspace-skeleton')).toHaveCount(0);
  await page.locator('.buyer-quick-actions a').first().click();
  await expect(page).toHaveURL('/dashboard/orders');
  await expect(page.locator('.bo-order-card')).toBeVisible();
});
