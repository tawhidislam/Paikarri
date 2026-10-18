import { test, expect } from '@playwright/test';
import { chatFixture as setup, cid } from '../helpers/chat-fixture';
test('supplier inbox shows distinct buyer conversations, previews and search', async ({
  page,
}, testInfo) => {
  await setup(page);
  await page.goto('/dashboard/messages');
  await expect(page.getByRole('heading', { name: 'Messages', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Buyer #A1000000/ })).toBeVisible();
  await expect(
    page.getByText('You: Yes, available in bulk. Which sizes do you need?'),
  ).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Search conversations', exact: true })
    .fill('price list');
  await expect(page.getByRole('button', { name: /Buyer #A1000000/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Buyer #B2000000/ })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search conversations', exact: true }).clear();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/supplier-inbox-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('conversation supports multiline composition and authenticated sending', async ({
  page,
}, testInfo) => {
  const calls = await setup(page);
  await page.goto(`/dashboard/messages?thread=${cid}`);
  const log = page.getByRole('log', { name: 'Conversation messages' });
  await expect(log.getByText('Can you supply 500 cotton shirts?')).toBeVisible();
  const send = page.getByRole('button', { name: 'Send message', exact: true });
  await expect(send).toBeDisabled();
  const input = page.getByRole('textbox', { name: 'Message', exact: true });
  await input.fill('Our minimum order is 100 pieces.');
  await input.press('Shift+Enter');
  await input.press('End');
  if ((page.viewportSize()?.width ?? 1440) <= 800) await send.click();
  else await input.press('Enter');
  await expect(log.getByText('Our minimum order is 100 pieces.')).toBeVisible();
  await expect(input).toHaveValue('');
  expect(calls.find((c) => c.name === 'chat_send' && c.method === 'POST')?.body).toMatchObject({
    target: cid,
    body: 'Our minimum order is 100 pieces.',
  });
  await page.screenshot({
    path: `artifacts/supplier-chat-${testInfo.project.name}.png`,
    fullPage: true,
  });
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Back to conversations', exact: true }).click();
    await expect(page).not.toHaveURL(/thread=/);
    await expect(
      page.getByRole('searchbox', { name: 'Search conversations', exact: true }),
    ).toBeVisible();
  }
});
test('failed sends preserve the message draft and expose a clear error', async ({ page }) => {
  await setup(page, { failSend: true });
  await page.goto(`/dashboard/messages?thread=${cid}`);
  const input = page.getByRole('textbox', { name: 'Message', exact: true });
  await input.fill('Synthetic retry message');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Rate limit exceeded');
  await expect(input).toHaveValue('Synthetic retry message');
});
test('unavailable thread does not fetch private message history', async ({ page }) => {
  const calls = await setup(page);
  await page.goto('/dashboard/messages?thread=not-authorized');
  await expect(page.getByRole('heading', { name: 'Conversation unavailable' })).toBeVisible();
  expect(calls.some((c) => c.name === 'chat_messages')).toBe(false);
});
test('Bangla inbox and buyer view remain readable', async ({ page }, testInfo) => {
  await setup(page, { locale: 'bn' });
  await page.goto(`/dashboard/messages?thread=${cid}`);
  await expect(page.getByRole('textbox', { name: 'বার্তা', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/supplier-chat-bn-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.unrouteAll({ behavior: 'wait' });
  await setup(page, { role: 'buyer' });
  await page.goto(`/dashboard/messages?thread=${cid}`);
  await expect(
    page.getByRole('heading', { name: 'Synthetic Textile Works', exact: true }),
  ).toBeVisible();
});
test('empty supplier inbox gives useful onboarding guidance', async ({ page }) => {
  await setup(page, { empty: true });
  await page.goto('/dashboard/messages');
  await expect(
    page.getByRole('heading', { name: 'No conversations yet', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Buyer inquiries will appear here.')).toBeVisible();
});
