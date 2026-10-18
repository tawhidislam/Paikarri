import { test, expect } from '@playwright/test';
import { chatFixture, cid, uid, buyer } from '../helpers/chat-fixture';

test('buyer list and full conversation fit narrow phones, tablet, landscape and desktop in both languages', async ({
  page,
}) => {
  test.setTimeout(90000);
  await chatFixture(page, { role: 'buyer', unread: 2 });
  await page.goto('/dashboard/messages');
  await expect(page.locator('.inbox-thread')).toHaveCount(2);
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 900],
    [844, 390],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const lang of ['en', 'bn']) {
      if ((await page.locator('html').getAttribute('lang')) !== lang)
        await page
          .getByRole('button', { name: lang === 'bn' ? 'বাংলা' : 'English', exact: true })
          .click();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `list ${width} ${lang}`,
      ).toBe(true);
      if (width === 390)
        await page
          .locator('.buyer-inbox')
          .screenshot({ path: `artifacts/buyer-inbox-${lang}-390.png` });
      await page.locator('.inbox-thread').first().click();
      await expect(page.getByRole('log')).toBeVisible();
      const mobile = width <= 800 || (width <= 1000 && height <= 500);
      const boxes = await page.evaluate(() => {
        const root = document.querySelector('.buyer-inbox')!,
          input = document.querySelector('.buyer-inbox textarea')!,
          send = document.querySelector('.buyer-inbox form button[type=submit]')!,
          log = document.querySelector('.buyer-inbox .inbox-history')!;
        const r = root.getBoundingClientRect(),
          i = input.getBoundingClientRect(),
          s = send.getBoundingClientRect(),
          l = log.getBoundingClientRect();
        return {
          rootTop: r.top,
          rootBottom: r.bottom,
          inputBottom: i.bottom,
          sendBottom: s.bottom,
          sendHeight: s.height,
          historyHeight: l.height,
          inputFont: parseFloat(getComputedStyle(input).fontSize),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(boxes.overflow).toBe(false);
      expect(boxes.sendHeight).toBeGreaterThanOrEqual(44);
      expect(boxes.inputFont).toBeGreaterThanOrEqual(16);
      expect(boxes.historyHeight).toBeGreaterThan(40);
      if (mobile) {
        expect(boxes.rootTop).toBeGreaterThanOrEqual(-1);
        expect(boxes.rootBottom).toBeLessThanOrEqual(height + 1);
        expect(boxes.inputBottom).toBeLessThanOrEqual(height);
        expect(boxes.sendBottom).toBeLessThanOrEqual(height);
        await expect(page.locator('.site-header')).not.toBeVisible();
      }
      if (width === 390)
        await page.screenshot({ path: `artifacts/buyer-conversation-${lang}-390.png` });
      if (mobile) await page.locator('.inbox-mobile-back').click();
      else await page.goBack();
      await expect(page.locator('.inbox-thread').first()).toBeFocused();
    }
  }
});

test('buyer search and unread filtering use server queries', async ({ page }) => {
  const calls = await chatFixture(page, { role: 'buyer', unread: 2 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard/messages');
  const search = page.getByRole('searchbox', { name: 'Search conversations', exact: true });
  await search.fill('Meghna');
  await expect(page.locator('.inbox-thread')).toHaveCount(1);
  await expect(page.locator('.inbox-thread')).toContainText('Meghna Packaging');
  await expect
    .poll(() => calls.filter((c) => c.name === 'chat_list').at(-1)?.body.search)
    .toBe('Meghna');
  await search.clear();
  await expect(page.locator('.inbox-thread')).toHaveCount(2);
  await page.getByRole('button', { name: 'Unread messages', exact: true }).click();
  await expect
    .poll(() => calls.filter((c) => c.name === 'chat_list').at(-1)?.body.unread_only)
    .toBe(true);
});

test('mobile composer keeps newlines, appends quick replies and recovers separate supplier drafts', async ({
  page,
}) => {
  const calls = await chatFixture(page, { role: 'buyer' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/dashboard/messages?thread=${cid}`);
  const input = page.getByRole('textbox', { name: 'Message', exact: true });
  await input.fill('Need 500 pieces');
  await input.press('End');
  await input.press('Enter');
  await expect(input).toHaveValue('Need 500 pieces\n');
  expect(calls.some((c) => c.name === 'chat_send')).toBe(false);
  await page.locator('.buyer-chat-prompts summary').click();
  await page
    .getByRole('button', { name: 'Please share your wholesale prices.', exact: true })
    .click();
  await expect(input).toHaveValue(/Need 500 pieces\n[\s\S]*Please share your wholesale prices\./);
  await page.locator('.inbox-mobile-back').click();
  await page.locator('.inbox-thread').filter({ hasText: 'Meghna Packaging' }).click();
  await expect(input).toHaveValue('');
  await input.fill('Packaging draft');
  await page.locator('.inbox-mobile-back').click();
  await page.locator('.inbox-thread').filter({ hasText: 'Synthetic Textile' }).click();
  await expect(input).toHaveValue(/Need 500 pieces/);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Need 500 pieces');
  await expect(input).toHaveValue('');
  expect(calls.find((c) => c.name === 'chat_send')?.body).toMatchObject({ target: cid });
});

test('keyboard-sized visual viewport keeps message entry and send visible and restores workspace on back', async ({
  page,
}) => {
  await chatFixture(page, { role: 'buyer' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard/messages');
  await expect(page.locator('.inbox-thread')).toHaveCount(2);
  const overflow = await page.evaluate(() => getComputedStyle(document.body).overflowY);
  await page.locator('.inbox-thread').first().click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 390 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('.buyer-inbox')).toHaveClass(/is-keyboard-open/);
  expect(
    await page.locator('.buyer-inbox').evaluate((e) => e.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(391);
  for (const selector of ['textarea', 'form button[type=submit]'])
    expect(
      await page
        .locator(`.buyer-inbox ${selector}`)
        .evaluate((e) => e.getBoundingClientRect().bottom),
    ).toBeLessThanOrEqual(390);
  await page.locator('.inbox-mobile-back').click();
  await expect(page.locator('.site-header')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).toBe(overflow);
});

test('failed sends retain buyer drafts, and conversation access notice explains monitoring', async ({
  page,
}) => {
  await chatFixture(page, { role: 'buyer', failSend: true });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`/dashboard/messages?thread=${cid}`);
  await page.locator('.buyer-chat-privacy summary').click();
  await expect(page.locator('.buyer-chat-privacy p')).toContainText('platform super admin');
  await page.locator('.buyer-chat-privacy summary').click();
  const input = page.getByRole('textbox', { name: 'Message', exact: true });
  await input.fill('Please confirm this order quantity');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Rate limit exceeded');
  await expect(input).toHaveValue('Please confirm this order quantity');
});

test('buyer can return from unavailable conversations and empty inbox links to real products', async ({
  page,
}) => {
  const calls = await chatFixture(page, { role: 'buyer', empty: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard/messages');
  await expect(
    page.getByRole('heading', { name: 'No conversations yet', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.inbox-list-empty a')).toHaveAttribute('href', '/products');
  await page.goto(`/dashboard/messages?thread=63000000-0000-4000-8000-000000000099`);
  await expect(
    page.getByRole('heading', { name: 'Conversation unavailable', exact: true }),
  ).toBeVisible();
  expect(calls.some((c) => c.name === 'chat_messages')).toBe(false);
  await page.getByRole('button', { name: 'Back to conversations', exact: true }).click();
  await expect(page).not.toHaveURL(/thread=/);
});

test('buyer can read older history without being forced down and jump to latest messages', async ({
  page,
}) => {
  await chatFixture(page, { role: 'buyer' });
  const rows = Array.from({ length: 50 }, (_, i) => ({
    id: `65000000-0000-4000-8000-${String(i + 100).padStart(12, '0')}`,
    conversation_id: cid,
    sender_id: i % 2 ? uid : buyer,
    body: `Wholesale discussion ${i + 1}. Confirm quantity, specifications and delivery.`,
    created_at: new Date(Date.UTC(2026, 9, 17, 3, 0, i)).toISOString(),
    product_snapshot: null,
  }));
  await page.route('**/rest/v1/rpc/chat_messages', async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json: {
        rows: body.after_cursor ? [] : rows,
        has_more: false,
        oldest: rows[0],
        newest: rows.at(-1),
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/dashboard/messages?thread=${cid}`);
  const log = page.getByRole('log');
  await expect(log).toContainText('Wholesale discussion 50');
  await log.evaluate((e) => {
    e.scrollTop = 0;
    e.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await expect(page.getByRole('button', { name: 'Latest messages', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Latest messages', exact: true }).click();
  await expect
    .poll(() => log.evaluate((e) => e.scrollHeight - e.scrollTop - e.clientHeight))
    .toBeLessThan(5);
});
