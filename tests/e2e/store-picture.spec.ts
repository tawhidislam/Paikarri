import { test, expect, type Page } from '@playwright/test';
import { chatFixture, uid, bid } from '../helpers/chat-fixture';
import { inspectChatImage } from '../../supabase/functions/_shared/chat-image-validation';

async function setup(page: Page, { locale = 'en', failUpload = false, failSave = false } = {}) {
  await chatFixture(page, { role: 'supplier', locale });
  const business = {
    id: bid,
    owner_id: uid,
    name: 'Synthetic Textile Works',
    name_bn: 'সিনথেটিক টেক্সটাইল',
    description: 'Synthetic supplier business for picture tests only.',
    address: 'Synthetic industrial road',
    district: 'Dhaka',
    division: 'Dhaka',
    contact_phone: '+8801712345678',
    website: '',
    verified: false,
    verification_application_id: null,
    profile_image_path: null as string | null,
    created_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
  };
  const calls: { name: string; body: Record<string, unknown> }[] = [];
  const uploads: { size: number; width: number; height: number; path: string }[] = [];
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      name = url.pathname.split('/').pop()!;
    if (request.method() === 'POST' && url.pathname.includes('/storage/v1/object/store-images/')) {
      if (failUpload)
        return route.fulfill({ status: 400, json: { message: 'Synthetic upload error' } });
      const buffer = request.postDataBuffer()!;
      const start = buffer.indexOf('RIFF');
      expect(start).toBeGreaterThanOrEqual(0);
      const bytes = buffer.subarray(start, start + buffer.readUInt32LE(start + 4) + 8);
      const info = inspectChatImage(bytes);
      const path = url.pathname.split('/object/store-images/')[1];
      uploads.push({ size: bytes.length, width: info.width, height: info.height, path });
      return route.fulfill({ json: { Key: `store-images/${path}` } });
    }
    if (request.method() === 'DELETE' && url.pathname.endsWith('/object/store-images')) {
      calls.push({ name: 'remove', body: request.postDataJSON() });
      return route.fulfill({ json: [] });
    }
    if (url.pathname.includes('/object/sign/store-images/')) {
      if (request.method() === 'POST')
        return route.fulfill({
          json: { signedURL: `/object/sign/store-images/preview.webp?token=synthetic` },
        });
      return route.fulfill({
        path: 'public/images/photo-1489987707025-afc232f7ea0f-320.webp',
        contentType: 'image/webp',
      });
    }
    if (name === 'businesses') return route.fulfill({ json: business });
    if (name === 'public_businesses') return route.fulfill({ json: [business] });
    if (name === 'shipping_preset_get') return route.fulfill({ json: null });
    if (name === 'set_store_picture') {
      const body = request.postDataJSON();
      calls.push({ name, body });
      if (failSave)
        return route.fulfill({
          status: 409,
          json: { message: 'Store picture changed. Refresh before trying again.' },
        });
      expect(body.expected_path).toBe(business.profile_image_path);
      business.profile_image_path = body.new_path;
      return route.fulfill({ json: null });
    }
    return route.fallback();
  });
  return { calls, uploads, business };
}
async function source(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#205f42';
    context.fillRect(0, 0, 2400, 1800);
    context.fillStyle = 'white';
    context.font = '90px sans-serif';
    context.fillText('Synthetic store picture', 100, 200);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return {
    name: 'synthetic-store.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  };
}

test('supplier uploads a compressed picture, sees it publicly, replaces and removes it', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/dashboard/business');
  const input = page.getByLabel('Choose store picture', { exact: true });
  await page.locator('input[name="name"]').fill('Unsaved profile edit');
  await input.setInputFiles(await source(page));
  await expect(page.getByRole('status').filter({ hasText: 'Store picture saved.' })).toBeVisible();
  await expect(page.locator('input[name="name"]')).toHaveValue('Unsaved profile edit');
  expect(state.uploads).toHaveLength(1);
  expect(state.uploads[0]).toMatchObject({ width: 512, height: 384 });
  expect(state.uploads[0].size).toBeLessThanOrEqual(262144);
  expect(state.uploads[0].path).toMatch(new RegExp(`^${uid}/${bid}/[0-9a-f-]+\\.webp$`));
  await expect(page.locator('.store-editor-avatar img')).toBeVisible();
  const first = state.business.profile_image_path;
  await page.goto(`/suppliers/${bid}`);
  await expect(page.locator('.business-avatar img')).toBeVisible();
  await page.goto('/dashboard/business');
  await page.getByLabel('Choose store picture', { exact: true }).setInputFiles(await source(page));
  await expect.poll(() => state.uploads.length).toBe(2);
  await expect(page.getByRole('status').filter({ hasText: 'Store picture saved.' })).toBeVisible();
  expect(
    state.calls.filter((call) => call.name === 'set_store_picture').at(-1)?.body.expected_path,
  ).toBe(first);
  expect(
    state.calls.some(
      (call) => call.name === 'remove' && (call.body.prefixes as string[]).includes(first!),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Remove picture', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Store picture removed.' }),
  ).toBeVisible();
  await expect(page.locator('.store-editor-avatar img')).toHaveCount(0);
  expect(state.business.profile_image_path).toBeNull();
});

test('failed association cleans the new object and leaves the previous store picture unchanged', async ({
  page,
}) => {
  const state = await setup(page, { failSave: true });
  await page.goto('/dashboard/business');
  await page.getByLabel('Choose store picture', { exact: true }).setInputFiles(await source(page));
  await expect(page.getByRole('alert')).toContainText('Store picture changed');
  expect(state.business.profile_image_path).toBeNull();
  expect(state.calls.filter((call) => call.name === 'remove')).toHaveLength(1);
  await expect(page.locator('.store-editor-avatar img')).toHaveCount(0);
});

test('upload errors and unsafe files do not attach a store picture', async ({ page }) => {
  const state = await setup(page, { failUpload: true });
  await page.goto('/dashboard/business');
  await page.getByLabel('Choose store picture', { exact: true }).setInputFiles({
    name: 'unsafe.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(page.getByRole('alert')).toContainText('Use a JPEG, PNG or WebP image.');
  await page.getByLabel('Choose store picture', { exact: true }).setInputFiles(await source(page));
  await expect(page.getByRole('alert')).toContainText('Synthetic upload error');
  expect(state.calls.some((call) => call.name === 'set_store_picture')).toBe(false);
});

test('Bangla upload controls fit narrow screens and retain a readable success message', async ({
  page,
}, info) => {
  await setup(page, { locale: 'bn' });
  await page.setViewportSize({ width: info.project.name === 'mobile' ? 320 : 768, height: 900 });
  await page.goto('/dashboard/business');
  await page.locator('.store-picture-editor input[type="file"]').setInputFiles(await source(page));
  await expect(
    page.getByRole('status').filter({ hasText: 'দোকানের ছবি সংরক্ষণ করা হয়েছে।' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/store-picture-${info.project.name}.png`,
    fullPage: true,
  });
});
