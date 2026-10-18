import { test, expect } from '@playwright/test';
import { chatFixture, cid, uid } from '../helpers/chat-fixture';
const imageId = 'fe000000-0000-4000-8000-000000000001';
test('chat compressor re-encodes and bounds actual browser output', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const compressorPath = '/src/lib/image-upload.ts';
    const { prepareImageUpload } = await import(compressorPath);
    const validatorPath = '/supabase/functions/_shared/chat-image-validation.ts';
    const { inspectChatImage } = await import(validatorPath);
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#23614b';
    context.fillRect(0, 0, 2400, 1800);
    context.fillStyle = 'white';
    context.font = '64px sans-serif';
    context.fillText('Synthetic chat image', 100, 100);
    const original = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png'),
    );
    const file = await prepareImageUpload(
      new File([original], 'test.png', { type: 'image/png' }),
      'chat-images',
    );
    const info = inspectChatImage(new Uint8Array(await file.arrayBuffer()));
    return { mime: file.type, size: file.size, originalSize: original.size, ...info };
  });
  expect(result.mime).toBe('image/webp');
  expect(result.size).toBeLessThanOrEqual(1048576);
  expect(result.width).toBe(1600);
  expect(result.height).toBe(1200);
  expect(result.size).toBeLessThan(result.originalSize);
});
async function setup(page: import('@playwright/test').Page, failOnce = false) {
  await chatFixture(page, { role: 'buyer' });
  let sends = 0,
    discards = 0;
  const calls: Record<string, unknown>[] = [];
  await page.route('**/rpc/chat_image_prepare', (r) =>
    r.fulfill({ json: { id: imageId, path: `${uid}/${cid}/${imageId}.webp` } }),
  );
  await page.route('**/storage/v1/object/chat-images/**', async (r) => {
    expect(r.request().method()).toBe('POST');
    await r.fulfill({ json: { Key: 'chat-images/test.webp' } });
  });
  await page.route('**/functions/v1/chat-image', async (r) => {
    const body = r.request().postDataJSON();
    if (body.action === 'discard') discards++;
    await r.fulfill({
      json:
        body.action === 'verify'
          ? { verified: true }
          : body.action === 'discard'
            ? { removed: true }
            : { url: 'https://example.invalid/chat.webp', width: 100, height: 80 },
    });
  });
  await page.route('https://example.invalid/chat.webp', (r) =>
    r.fulfill({ status: 404, body: '' }),
  );
  await page.route('**/rpc/chat_send_image', async (r) => {
    sends++;
    const body = r.request().postDataJSON();
    calls.push(body);
    if (failOnce && sends === 1) {
      await r.fulfill({ status: 503, json: { message: 'Temporary image message failure' } });
      return;
    }
    await r.fulfill({
      json: {
        id: 'fe000000-0000-4000-8000-000000000002',
        conversation_id: cid,
        sender_id: uid,
        body: body.body || 'Image',
        image_id: imageId,
        product_snapshot: null,
        created_at: '2026-10-18T12:00:00Z',
      },
    });
  });
  await page.goto(`/dashboard/messages?thread=${cid}`);
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 100;
    const x = c.getContext('2d')!;
    x.fillStyle = 'green';
    x.fillRect(0, 0, 200, 100);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Choose chat image', { exact: true }).setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  await expect(page.getByRole('img', { name: 'Image preview' })).toBeVisible();
  return { calls, getDiscards: () => discards };
}
test('buyer previews, removes and sends compressed image with a caption', async ({
  page,
}, info) => {
  const state = await setup(page);
  await page
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('Photo of the requested finish');
  await page.screenshot({ path: `artifacts/chat-images/${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Photo of the requested finish');
  await expect(page.getByRole('img', { name: 'Image preview' })).toHaveCount(0);
  expect(state.calls[0]).toMatchObject({ image: imageId, body: 'Photo of the requested finish' });
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('synthetic.png');
});
test('failed image send preserves preview and reuses nonce on retry', async ({ page }) => {
  const state = await setup(page, true);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Temporary image message failure');
  await expect(page.getByRole('img', { name: 'Image preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => state.calls.length).toBe(2);
  expect(state.calls[0].nonce).toBe(state.calls[1].nonce);
});
test('removing an unsent attachment discards it and keeps the typed text', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Keep this draft');
  await page.getByRole('button', { name: 'Remove image', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Image preview' })).toHaveCount(0);
  expect(state.getDiscards()).toBe(1);
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(
    'Keep this draft',
  );
});
