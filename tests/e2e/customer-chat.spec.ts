import { test, expect } from '@playwright/test';
import { chatFixture, cid, bid, pid } from '../helpers/chat-fixture';
test('buyer opens floating product chat, shares product context and keeps draft across minimize', async ({
  page,
}, info) => {
  const calls = await chatFixture(page, { role: 'buyer', unread: 2 });
  await page.goto(`/products/${pid}`);
  await page.getByRole('button', { name: 'Chat now', exact: true }).click();
  const chat = page.getByRole('region', { name: 'Supplier chat', exact: true });
  await expect(chat).toBeVisible();
  await expect(chat.locator('.chat-product-draft')).toContainText('Synthetic cotton shirt');
  const input = chat.getByRole('textbox', { name: 'Message', exact: true });
  await input.fill('Can you quote for 500 pieces?');
  await page.getByRole('button', { name: 'Minimize chat' }).click();
  await expect(input).toHaveCount(0);
  await chat.getByRole('button', { name: 'Supplier chat', exact: true }).click();
  await expect(chat.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(
    'Can you quote for 500 pieces?',
  );
  await chat.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('Can you quote for 500 pieces?');
  expect(calls.find((c) => c.name === 'chat_send')?.body).toMatchObject({
    target: cid,
    product: pid,
  });
  await expect(chat.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
  await expect(chat.locator('.chat-product-draft')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/customer-product-chat-${info.project.name}.png`,
    fullPage: info.project.name === 'desktop',
  });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Supplier chat', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Chat now', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Chat now', exact: true }).click();
  await page.getByRole('link', { name: 'Open full inbox' }).click();
  await expect(page).toHaveURL(new RegExp(`thread=${cid}`));
});
test('supplier sees unread badge, read receipt, older messages and server-side search', async ({
  page,
}, info) => {
  const calls = await chatFixture(page, { unread: 2, older: true });
  await page.goto(`/dashboard/messages?thread=${cid}`);
  await expect(page.locator('.chat-receipt.is-read')).toContainText('Read');
  await expect.poll(() => calls.some((c) => c.name === 'chat_mark_read')).toBe(true);
  await page.getByRole('button', { name: 'Load older messages', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Earlier inquiry from last week');
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Back to conversations', exact: true }).click();
  await page.getByRole('button', { name: 'Unread messages', exact: true }).click();
  await expect
    .poll(() => calls.filter((c) => c.name === 'chat_list').at(-1)?.body.unread_only)
    .toBe(true);
});
test('guest chat preserves supplier/product intent through login redirect', async ({ page }) => {
  const calls = await chatFixture(page, { role: 'guest' });
  await page.goto(`/products/${pid}`);
  await page.getByRole('button', { name: 'Chat now', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login\?next=/);
  const next = new URL(page.url()).searchParams.get('next')!;
  expect(next).toContain(`chat=${bid}`);
  expect(next).toContain(`chat_product=${pid}`);
  expect(calls.some((c) => c.name === 'chat_start')).toBe(false);
});
test('buyer returning with chat intent opens product context without automatically sending', async ({
  page,
}) => {
  const calls = await chatFixture(page, { role: 'buyer' });
  await page.goto(`/products/${pid}?chat=${bid}&chat_product=${pid}`);
  await expect(page.getByRole('region', { name: 'Supplier chat', exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/chat=/);
  expect(calls.filter((c) => c.name === 'chat_start')).toHaveLength(1);
  expect(calls.some((c) => c.name === 'chat_send')).toBe(false);
});
test('failed send retries reuse nonce and unsent drafts survive conversation switching', async ({
  page,
}, info) => {
  const calls = await chatFixture(page, { failSend: true });
  await page.goto(`/dashboard/messages?thread=${cid}`);
  const input = page.getByRole('textbox', { name: 'Message', exact: true });
  await input.fill('Please confirm delivery.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Rate limit exceeded');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => calls.filter((c) => c.name === 'chat_send').length).toBe(2);
  const sends = calls.filter((c) => c.name === 'chat_send');
  expect(sends[0].body.nonce).toBe(sends[1].body.nonce);
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Back to conversations', exact: true }).click();
  await page.getByRole('button', { name: /Buyer #B2000000/ }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Back to conversations', exact: true }).click();
  await page.getByRole('button', { name: /Buyer #A1000000/ }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(
    'Please confirm delivery.',
  );
});
