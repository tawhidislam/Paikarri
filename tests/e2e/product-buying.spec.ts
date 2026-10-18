import { test, expect, type Page } from '@playwright/test';
import { chatFixture, pid, bid } from '../helpers/chat-fixture';
const red = '71000000-0000-4000-8000-000000000011',
  blue = '71000000-0000-4000-8000-000000000012';
async function buyingFixture(page: Page, { locale = 'en', role = 'buyer' } = {}) {
  await chatFixture(page, { role, locale });
  const calls: { name: string; body: Record<string, unknown> }[] = [];
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      name = url.pathname.split('/').pop()!;
    const body = req.method() === 'POST' ? (req.postDataJSON() ?? {}) : {};
    let data: unknown;
    const source = {
      product_id: pid,
      preparation_min: 2,
      preparation_max: 5,
      dispatch_location: 'Dhaka',
      packaging: '40 × 30 × 20 cm carton',
      delivery_notes: 'Confirm transport before dispatch.',
      samples_enabled: true,
      sample_limit: 2,
      customization_enabled: true,
      customization_moq: 100,
      version: 1,
      estimates_updated_at: '2026-10-17T00:00:00Z',
    };
    const skus = [
      {
        id: red,
        code: 'RED',
        stock: 500,
        active: true,
        image_id: null,
        version: 1,
        options: { Color: 'Red' },
        prices: [
          { min_quantity: 1, price: 200 },
          { min_quantity: 100, price: 185 },
        ],
      },
      {
        id: blue,
        code: 'BLUE',
        stock: 500,
        active: true,
        image_id: null,
        version: 1,
        options: { Color: 'Blue' },
        prices: [
          { min_quantity: 1, price: 220 },
          { min_quantity: 100, price: 195 },
        ],
      },
    ];
    if (name === 'product_options')
      data = { sourcing: source, attributes: [{ name: 'Color', values: ['Red', 'Blue'] }], skus };
    else if (name === 'product_reviews_read')
      data = { total: 0, rating: null, count: 0, sample_count: 0, rows: [] };
    else if (name === 'my_product_review') data = { review: null, orders: [] };
    else if (name === 'cart_quote') data = { rows: [] };
    else if (name === 'cart_skus_set') {
      calls.push({ name, body });
      data = null;
    } else if (
      name === 'public_products' &&
      url.searchParams.has('id') &&
      url.searchParams.get('id')!.startsWith('neq.')
    )
      data = [];
    else if (
      name === 'public_products' &&
      url.searchParams.has('id') &&
      url.searchParams.get('id')!.startsWith('not.in.')
    )
      data = [];
    else if (name === 'product_images')
      data = [1, 2].map((i) => ({
        id: `72000000-0000-4000-8000-00000000000${i}`,
        product_id: pid,
        path: `test/${i}.webp`,
        position: i - 1,
      }));
    else if (req.method() === 'POST' && url.pathname.includes('/storage/v1/object/sign/'))
      data = { signedURL: '/object/sign/product-images/fixture.webp?token=fixture' };
    else if (req.method() === 'GET' && url.pathname.includes('/storage/v1/object/sign/'))
      return route.fulfill({
        path: 'public/images/photo-1489987707025-afc232f7ea0f-320.webp',
        contentType: 'image/webp',
      });
    else return route.fallback();
    await route.fulfill({ json: data });
  });
  return calls;
}
test('mixed variants share MOQ and SKU tiers; sticky controls reflect the same total', async ({
  page,
}) => {
  const calls = await buyingFixture(page);
  await page.goto(`/products/${pid}`);
  await page.getByRole('spinbutton', { name: 'Color: Red', exact: true }).fill('60');
  await page.getByRole('spinbutton', { name: 'Color: Blue', exact: true }).fill('40');
  await expect(page.locator('.pd-buy-total')).toContainText('18,900');
  await expect(page.locator('.pd-sku').first()).toContainText('185');
  await expect(page.locator('.pd-sku').nth(1)).toContainText('195');
  await page.getByRole('spinbutton', { name: 'Color: Blue', exact: true }).fill('39');
  await expect(page.locator('.pd-main-buy')).toBeDisabled();
  await page.getByRole('spinbutton', { name: 'Color: Blue', exact: true }).fill('40');
  await page.locator('.pd-main-buy').click();
  await expect
    .poll(() => calls.find((c) => c.name === 'cart_skus_set')?.body)
    .toEqual({
      product: pid,
      selections: [
        { sku_id: red, quantity: 60 },
        { sku_id: blue, quantity: 40 },
      ],
    });
});
test('gallery supports zoom, keyboard navigation, dismissal and focus restoration', async ({
  page,
}) => {
  await buyingFixture(page);
  await page.goto(`/products/${pid}`);
  const open = page.getByRole('button', { name: 'Open fullscreen gallery' });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Product image gallery' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(dialog.locator('.pd-lightbox-stage>div')).toHaveAttribute('style', /150%/);
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.pd-lightbox-toolbar')).toContainText('2 / 2');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
});
test('comparison refuses a fifth product and persists identifiers only', async ({ page }) => {
  await buyingFixture(page);
  const ids = [1, 2, 3, 4].map((i) => `73000000-0000-4000-8000-00000000000${i}`);
  await page.addInitScript(
    (ids) => localStorage.setItem('paikari-compare', JSON.stringify(ids)),
    ids,
  );
  await page.goto(`/products/${pid}`);
  await page.getByRole('button', { name: 'Compare product', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Remove a product');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('paikari-compare')!))).toEqual(
    ids,
  );
});
test('sample and customization requests expose supplier limits and private-file guidance', async ({
  page,
}) => {
  await buyingFixture(page);
  await page.goto(`/products/${pid}`);
  await page.getByRole('button', { name: 'Request sample', exact: true }).click();
  const request = page.locator('.pd-request-form');
  await expect(request.getByRole('spinbutton', { name: 'Color: Red', exact: true })).toHaveValue(
    '1',
  );
  await expect(request.getByRole('spinbutton').first()).toHaveAttribute('max', '2');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Request customization', exact: true })
    .click();
  await expect(request.getByRole('textbox', { name: 'Branding requirements' })).toBeVisible();
  await expect(request).toContainText('private attachments');
});
test('product layouts remain readable without overflow in English and Bangla', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Viewport matrix runs once in desktop Chromium');
  for (const locale of ['en', 'bn']) {
    await buyingFixture(page, { locale });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/products/${pid}`);
      await expect(page.locator('.pd-buy-total')).toBeVisible();
      await expect(page.locator('.pd-delivery-facts')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        JSON.stringify(
          await page.evaluate(() =>
            Array.from(document.querySelectorAll('body *'))
              .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 16)
              .map((e) => ({
                tag: e.tagName,
                cls: e.className,
                width: e.getBoundingClientRect().width,
                right: e.getBoundingClientRect().right,
                text: e.textContent?.slice(0, 70),
              })),
          ),
        ),
      ).toBe(true);
      if (width === 390) {
        await expect(page.locator('.pd-mobile-buy')).toBeVisible();
        const sticky = await page.locator('.pd-mobile-buy').boundingBox();
        const launcher = await page.locator('.chat-launcher').boundingBox();
        if (launcher && sticky) expect(launcher.y + launcher.height).toBeLessThanOrEqual(sticky.y);
        await page.screenshot({
          path: `artifacts/product-buying-${locale}-390.png`,
          fullPage: true,
        });
      }
      if (width === 1440 && locale === 'en')
        await page.screenshot({ path: 'artifacts/product-buying-en-1440.png', fullPage: true });
    }
  }
});

test('accepted sample offers use a separate checkout and preserve the negotiated price', async ({
  page,
}) => {
  const calls = await buyingFixture(page);
  const request = '74000000-0000-4000-8000-000000000001',
    offer = '74000000-0000-4000-8000-000000000002',
    order = '74000000-0000-4000-8000-000000000003';
  await page.route('**/rest/v1/rpc/sourcing_detail', (route) =>
    route.fulfill({
      json: {
        id: request,
        buyer_id: '190b6f2a-5dd6-44f3-ae10-3a9a567d7fb5',
        product_id: pid,
        business_id: bid,
        kind: 'sample',
        revision: 1,
        product_name: 'Synthetic cotton shirt',
        revisions: [
          {
            revision: 1,
            version: 2,
            requirements: 'Synthetic sample request',
            branding: '',
            packaging: '',
            specifications: '',
            desired_date: null,
            district: 'Dhaka',
            submitted_at: '2026-10-17T00:00:00Z',
            lines: [{ sku_id: red, quantity: 1, options: { Color: 'Red' } }],
            files: [],
          },
        ],
        offers: [
          {
            id: offer,
            revision: 1,
            request_revision: 1,
            preparation_min: 1,
            preparation_max: 2,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            notes: 'Sample price includes preparation.',
            accepted_order_id: null,
            lines: [{ sku_id: red, quantity: 1, unit_price: 25 }],
          },
        ],
      },
    }),
  );
  await page.route('**/rest/v1/rpc/sourcing_offer_checkout', async (route) => {
    calls.push({ name: 'sourcing_offer_checkout', body: route.request().postDataJSON() });
    await route.fulfill({ json: { ids: [order] } });
  });
  await page.goto(`/dashboard/requests/${request}`);
  await page.getByRole('link', { name: 'Accept offer & checkout' }).click();
  await expect(page.locator('.order-summary')).toContainText('25');
  await page
    .getByRole('textbox', { name: 'Recipient name', exact: true })
    .fill('Synthetic Receiver');
  await page.getByRole('textbox', { name: 'Mobile number', exact: true }).fill('01712345678');
  await page
    .getByRole('textbox', { name: 'Street address and delivery instructions' })
    .fill('10 Synthetic Road Dhaka');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Place order request', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/orders/${order}`));
  expect(calls.find((c) => c.name === 'sourcing_offer_checkout')?.body).toMatchObject({
    target: offer,
    expected_revision: 1,
    method: 'cod',
  });
  expect(calls.some((c) => c.name === 'cart_skus_set')).toBe(false);
});

test('staff moderation receives safe review content and records a reasoned decision', async ({
  page,
}) => {
  await buyingFixture(page, { role: 'admin' });
  const id = '75000000-0000-4000-8000-000000000001';
  const calls: Record<string, unknown>[] = [];
  let pending = true;
  await page.route('**/rest/v1/rpc/admin_reviews', (route) =>
    route.fulfill({
      json: {
        total: pending ? 1 : 0,
        rows: pending
          ? [
              {
                id,
                product_id: pid,
                product_name: 'Synthetic cotton shirt',
                buyer_name: 'Synthetic Buyer',
                rating: 4,
                body: 'Synthetic review of a completed purchase.',
                status: 'pending',
                version: 1,
                eligible: true,
                purchase_kind: 'wholesale',
                reply: null,
                reports: [],
              },
            ]
          : [],
      },
    }),
  );
  await page.route('**/rest/v1/rpc/admin_review_decide', async (route) => {
    calls.push(route.request().postDataJSON());
    pending = false;
    await route.fulfill({ json: null });
  });
  await page.goto('/admin/reviews');
  await expect(page.getByRole('heading', { name: 'Review moderation', exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Decision reason' })
    .fill('Synthetic review meets publication requirements');
  await page.getByRole('button', { name: 'approved', exact: true }).click();
  await expect(page.getByText('No reviews to display')).toBeVisible();
  expect(calls[0]).toMatchObject({
    target: id,
    kind: 'review',
    decision: 'approved',
    expected_version: 1,
  });
  expect(await page.locator('body').innerText()).not.toContain('Payment reference');
});

test('supplier manages variant stock separately and bounds generated combinations', async ({
  page,
}) => {
  await buyingFixture(page, { role: 'supplier' });
  const calls: Record<string, unknown>[] = [];
  await page.route('**/rest/v1/businesses?*', (route) =>
    route.fulfill({
      json: {
        id: bid,
        owner_id: '190b6f2a-5dd6-44f3-ae10-3a9a567d7fb5',
        name: 'Synthetic supplier',
        name_bn: '',
        description: 'Synthetic supplier record',
        division: 'Dhaka',
        district: 'Dhaka',
        address: 'Synthetic location',
        contact_phone: '01712345678',
        website: '',
        verified: false,
        created_at: '2026-10-17T00:00:00Z',
        updated_at: '2026-10-17T00:00:00Z',
        verification_application_id: null,
      },
    }),
  );
  await page.route('**/rest/v1/products?*', (route) =>
    route.fulfill({
      json: {
        id: pid,
        business_id: bid,
        category_id: '66000000-0000-4000-8000-000000000001',
        name: 'Synthetic cotton shirt',
        name_bn: '',
        description: 'Synthetic product for browser testing.',
        price: 185,
        moq: 100,
        stock: 1000,
        unit: 'piece',
        specifications: { Material: 'Cotton' },
        status: 'approved',
        created_at: '2026-10-17T00:00:00Z',
        updated_at: '2026-10-17T00:00:00Z',
        search_vector: null,
      },
    }),
  );
  await page.route('**/rest/v1/rpc/supplier_inventory', async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({ json: null });
  });
  await page.goto(`/dashboard/products/${pid}`);
  await expect(
    page.getByRole('spinbutton', { name: 'Available stock (unreserved units)', exact: true }),
  ).toHaveAttribute('readonly', '');
  const row = page
    .locator('.pd-sku-editor fieldset')
    .filter({ has: page.locator('legend', { hasText: 'Color: Red' }) });
  await row.getByRole('spinbutton', { name: 'Available stock', exact: true }).fill('400');
  await row.getByRole('button', { name: 'Update stock only' }).click();
  await expect.poll(() => calls[0]).toEqual({ target: red, expected_version: 1, quantity: 400 });
  await page
    .getByRole('textbox', { name: 'Variant attributes', exact: true })
    .fill(
      `Color: ${Array.from({ length: 11 }, (_, i) => 'C' + i).join(', ')}\nSize: ${Array.from({ length: 10 }, (_, i) => 'S' + i).join(', ')}`,
    );
  await page.getByRole('button', { name: 'Generate combinations' }).click();
  await expect(page.getByRole('alert')).toContainText('At most 100 SKU combinations');
});

test('completed buyers submit reviews for moderation without publishing immediately', async ({
  page,
}) => {
  await buyingFixture(page);
  const order = '76000000-0000-4000-8000-000000000001';
  const calls: Record<string, unknown>[] = [];
  await page.route('**/rest/v1/rpc/my_product_review', (route) =>
    route.fulfill({
      json: { review: null, orders: [{ id: order, number: 101, purchase_kind: 'wholesale' }] },
    }),
  );
  await page.route('**/rest/v1/rpc/review_save', async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({ json: '76000000-0000-4000-8000-000000000002' });
  });
  await page.goto(`/products/${pid}`);
  await page
    .getByRole('textbox', { name: 'Your review', exact: true })
    .fill('Synthetic feedback from a completed order.');
  await page.getByRole('combobox', { name: 'Rating', exact: true }).selectOption('4');
  await page.getByRole('button', { name: 'Submit for moderation', exact: true }).click();
  await expect
    .poll(() => calls[0])
    .toMatchObject({
      product: pid,
      order_ref: order,
      rating: 4,
      body: 'Synthetic feedback from a completed order.',
      expected_version: 0,
    });
  await expect(page.locator('.pd-reviews')).toContainText('No published reviews yet.');
});
