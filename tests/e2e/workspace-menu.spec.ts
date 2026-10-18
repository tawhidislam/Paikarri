import { test, expect } from '@playwright/test';
import { orderFixture } from '../helpers/order-fixture';

test('workspace sheet traps focus, dismisses cleanly, follows routes and handles short screens', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Explicit viewport matrix runs once');
  for (const locale of ['en', 'bn']) {
    await orderFixture(page, { locale });
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [768, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard');
      const trigger = page.locator('.buyer-mobile-heading button');
      const sheet = page.locator('#buyer-workspace-menu');
      await trigger.click();
      await expect(sheet).toBeVisible();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
      const box = (await sheet.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
      expect(await sheet.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await expect(sheet.locator('a')).toHaveCount(12);
      await sheet.locator('.workspace-menu-signout').focus();
      await page.keyboard.press('Tab');
      await expect(sheet.locator('.workspace-menu-header button')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(sheet).not.toBeVisible();
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      await trigger.click();
      await page.mouse.click(2, 2);
      await expect(sheet).not.toBeVisible();
      await trigger.click();
      await sheet.locator('a[href="/dashboard/settings"]').click();
      await expect(page).toHaveURL('/dashboard/settings');
      await expect(sheet).not.toBeVisible();
      await trigger.click();
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(sheet).not.toBeVisible();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      await expect(page.locator('.dashboard-sidebar a[href="/dashboard/settings"]')).toBeVisible();
    }
  }
});

test('sign-out releases the sheet and clears the local session on success or remote failure', async ({
  page,
}) => {
  for (const status of [204, 500]) {
    await orderFixture(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/auth/v1/logout*', (route) =>
      route.fulfill(
        status === 204
          ? { status: 204 }
          : { status: 500, json: { message: 'Synthetic sign-out failure' } },
      ),
    );
    await page.goto('/dashboard');
    await page.locator('.buyer-mobile-heading button').click();
    const sheet = page.locator('#buyer-workspace-menu');
    await sheet.getByRole('button', { name: 'Sign out', exact: true }).click();
    // The private-route guard can redirect before the logout callback returns.
    await expect(page).toHaveURL(/\/(?:auth\/login(?:\?.*)?)?$/);
    await expect(sheet).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    expect(
      await page.evaluate(() => !localStorage.getItem('sb-zhllnfciehxmjahljrhb-auth-token')),
    ).toBe(true);
  }
});
