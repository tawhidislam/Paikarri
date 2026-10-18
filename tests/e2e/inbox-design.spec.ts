import { test, expect } from '@playwright/test';
import { chatFixture } from '../helpers/chat-fixture';
for (const role of ['buyer', 'supplier']) {
  test(`${role} inbox layout has visible controls and usable history in both languages`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'Viewport matrix runs once.');
    test.setTimeout(90000);
    await chatFixture(page, { role, unread: 2 });
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [768, 900],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      for (const lang of ['en', 'bn']) {
        await page.goto('/dashboard/messages');
        if ((await page.locator('html').getAttribute('lang')) !== lang)
          await page
            .getByRole('button', { name: lang === 'bn' ? 'বাংলা' : 'English', exact: true })
            .click();
        await expect(page.locator('.inbox-thread')).toHaveCount(2);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.locator('.inbox-thread').first().click();
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expect(page.getByRole('log')).toBeVisible();
        const bounds = await page.locator('.workspace-inbox').evaluate((root) => {
          const input = root.querySelector('textarea')!,
            send = root.querySelector('button[type=submit]')!,
            attach = root.querySelector('.chat-attach-button')!,
            history = root.querySelector('.inbox-history')!;
          return {
            input: input.getBoundingClientRect().bottom,
            send: send.getBoundingClientRect().bottom,
            attach: attach.getBoundingClientRect().bottom,
            history: history.getBoundingClientRect().height,
            sendHeight: send.getBoundingClientRect().height,
            inputFont: parseFloat(getComputedStyle(input).fontSize),
          };
        });
        expect(bounds.inputFont).toBeGreaterThanOrEqual(16);
        expect(bounds.sendHeight).toBeGreaterThanOrEqual(44);
        expect(bounds.history).toBeGreaterThan(80);
        if (width === 1440) expect(bounds.send).toBeLessThanOrEqual(height);
        if (width <= 800) {
          expect(Math.max(bounds.input, bounds.send, bounds.attach)).toBeLessThanOrEqual(height);
          await expect(page.locator('.site-header')).not.toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (width === 390 || width === 1440)
          await page.screenshot({
            path: `artifacts/inbox-redesign/${role}-${lang}-${width}.png`,
            fullPage: true,
          });
      }
    }
  });
}
test('supplier mobile keyboard keeps the composer visible and back restores list focus', async ({
  page,
}) => {
  await chatFixture(page, { role: 'supplier' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard/messages');
  await page.locator('.inbox-thread').first().click();
  await expect(page.getByRole('log')).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 390 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('.supplier-inbox')).toHaveClass(/is-keyboard-open/);
  expect(
    await page
      .getByRole('textbox', { name: 'Message', exact: true })
      .evaluate((e) => e.getBoundingClientRect().bottom),
  ).toBeLessThanOrEqual(390);
  await page.locator('.inbox-mobile-back').click();
  await expect(page.locator('.inbox-thread').first()).toBeFocused();
  await expect(page.locator('.site-header')).toBeVisible();
});
