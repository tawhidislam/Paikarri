import { test, expect, type Page } from '@playwright/test';
const userId = 'a1000000-0000-4000-8000-000000000001';
const buyerId = 'a1000000-0000-4000-8000-000000000003';
const businessId = 'a2000000-0000-4000-8000-000000000001';
const productId = 'a4000000-0000-4000-8000-000000000001';
const platform = {
  name_en: 'Paikarii.com',
  name_bn: 'পাইকারি',
  tagline_en: 'Bangladesh, in business.',
  tagline_bn: 'বাংলাদেশের ব্যবসার সঙ্গী।',
  support_email: 'support@example.invalid',
  support_phone: '+8801712345678',
  default_locale: 'en',
  supplier_registration_open: true,
};
const account = {
  id: buyerId,
  full_name: 'Test buyer',
  email: 'buyer@example.invalid',
  phone: null,
  role: 'buyer',
  status: 'active',
  reason: '',
  created_at: '2026-10-16T04:00:00Z',
  last_sign_in_at: null,
  email_confirmed_at: '2026-10-16T04:00:00Z',
  business_id: null,
  name: null,
  division: null,
  district: null,
  verified: null,
};
async function consoleSession(
  page: Page,
  role = 'super_admin',
  defaultLocale = 'en',
  preferred?: string,
) {
  const calls: { name: string; body: Record<string, unknown> }[] = [];
  await page.addInitScript(
    ({ userId, preferred }) => {
      const now = Math.floor(Date.now() / 1000);
      const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: userId, role: 'authenticated', exp: now + 3600 }))}.testsignature`;
      localStorage.setItem(
        'sb-zhllnfciehxmjahljrhb-auth-token',
        JSON.stringify({
          access_token: token,
          refresh_token: 'test-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: now + 3600,
          user: {
            id: userId,
            email: 'owner@example.invalid',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: { provider: 'email' },
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        }),
      );
      if (preferred) localStorage.setItem('paikari-locale', preferred);
    },
    { userId, preferred },
  );
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split('/').pop()!;
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    calls.push({ name, body });
    let data: unknown;
    if (name === 'notification_unread_count') data = 0;
    else if (name === 'user_roles') data = { role };
    else if (name === 'get_account_status') data = { status: 'active', reason: '' };
    else if (name === 'get_platform_settings')
      data = { ...platform, default_locale: defaultLocale };
    else if (name === 'admin_statistics')
      data = {
        counts: {
          Accounts: 1,
          Suppliers: 0,
          Products: 0,
          Quotations: 0,
          'Pending products': 0,
          'Pending verifications': 0,
          'Open reports': 0,
          'Suspended accounts': 0,
        },
        trends: [
          { date: '2026-10-16', registrations: 1, suppliers: 0, products: 0, quotations: 0 },
        ],
      };
    else if (name === 'admin_list') {
      const kind = body.kind;
      const filters = body.filters as Record<string, string>;
      if (kind === 'accounts') data = { total: 51, rows: [account] };
      else if (kind === 'staff') data = { total: 0, rows: [] };
      else if (kind === 'products')
        data = {
          total: 1,
          rows: [
            {
              id: productId,
              business_id: businessId,
              category_id: userId,
              name: 'Test wholesale product',
              name_bn: '',
              description: 'Product description for administrative review',
              price: 100,
              moq: 10,
              stock: 500,
              unit: 'piece',
              specifications: { material: 'Cotton' },
              status: 'pending',
              moderation_note: '',
              created_at: '2026-10-16T04:00:00Z',
              updated_at: '2026-10-16T04:00:00Z',
              supplier_name: 'Test supplier',
              images: [
                { id: 'img1', path: 'one.jpg', position: 0, product_id: productId },
                { id: 'img2', path: 'two.jpg', position: 1, product_id: productId },
              ],
              tiers: [{ min_quantity: 100, price: 90 }],
            },
          ],
        };
      else if (kind === 'categories')
        data = {
          total: 1,
          rows: [
            {
              id: userId,
              name: 'Test category',
              name_bn: 'পরীক্ষা',
              slug: 'test',
              parent_id: null,
              icon: 'Package',
              parent_name: null,
            },
          ],
        };
      else data = { total: 0, rows: [] };
      if (filters?.q === 'nomatch') data = { total: 0, rows: [] };
    } else if (
      route.request().method() === 'POST' &&
      url.pathname.includes('/storage/v1/object/sign/')
    )
      data = { signedURL: '/object/sign/product-images/test.jpg?token=test' };
    else if (url.pathname.includes('/storage/'))
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      });
    else if (
      [
        'admin_set_account_status',
        'admin_set_staff',
        'admin_update_settings',
        'moderate_product',
      ].includes(name)
    )
      data = null;
    else if (name === 'categories') data = [];
    else data = null;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  return calls;
}
test('super admin console has separate navigation and real statistics interface', async ({
  page,
}) => {
  await consoleSession(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Your marketplace, at a glance.' })).toBeVisible();
  await expect(page.locator('.site-header')).toHaveCount(0);
  await expect(page.locator('.site-footer')).toHaveCount(0);
  if (test.info().project.name === 'mobile')
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(page.getByRole('link', { name: 'Staff access', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Platform settings', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/admin-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test('owner account controls require a reason and confirmation; filters and pagination are server-side', async ({
  page,
}) => {
  const calls = await consoleSession(page);
  await page.goto('/admin/accounts');
  await expect(page.getByText('buyer@example.invalid', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Suspend account', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Suspend account' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  expect(calls.some((c) => c.name === 'admin_set_account_status')).toBe(false);
  await dialog.getByLabel('Reason', { exact: true }).fill('Policy review required');
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(calls.find((c) => c.name === 'admin_set_account_status')?.body).toMatchObject({
    target: buyerId,
    new_status: 'suspended',
    reason: 'Policy review required',
  });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect.poll(() => calls.filter((c) => c.name === 'admin_list').at(-1)?.body.page).toBe(2);
  await page.getByLabel('Search', { exact: true }).fill('nomatch');
  await expect(page.getByRole('heading', { name: 'No records found' })).toBeVisible();
  await expect.poll(() => calls.filter((c) => c.name === 'admin_list').at(-1)?.body.page).toBe(1);
});
test('staff can moderate but cannot access owner routes or category controls', async ({ page }) => {
  await consoleSession(page, 'admin');
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
  await page.goto('/admin/staff');
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
  await page.goto('/admin/accounts');
  await expect(page.getByText('buyer@example.invalid', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Suspend account' })).toHaveCount(0);
  await page.goto('/admin/categories');
  await expect(page.getByText('Categories are read-only for staff administrators.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add category' })).toHaveCount(0);
  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: 'Test wholesale product' })).toBeVisible();
  await expect(page.locator('.review-image-gallery img')).toHaveCount(2);
  await expect
    .poll(() =>
      page
        .locator('.review-image-gallery img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect(page.getByText(/Cotton/)).toBeVisible();
});
test('buyers cannot enter console; admins move from legacy dashboard', async ({ page }) => {
  await consoleSession(page, 'buyer');
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
});
test('legacy moderation URL redirects administrators into console', async ({ page }) => {
  await consoleSession(page);
  await page.goto('/dashboard/moderation');
  await expect(page).toHaveURL('/admin/products');
  await expect(page.getByRole('heading', { name: 'Product moderation' })).toBeVisible();
});
test('platform default locale and saved preference are respected', async ({ page }) => {
  await consoleSession(page, 'super_admin', 'bn', 'en');
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Platform settings' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Default language', exact: true })).toHaveValue(
    'bn',
  );
});
test('platform default Bangla is used without a saved preference', async ({ page }) => {
  await consoleSession(page, 'super_admin', 'bn');
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'এক নজরে আপনার মার্কেটপ্লেস।' })).toBeVisible();
});
test('admin login reuses password visibility without submitting credentials', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('Local-test-password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
});

async function moderationFixture(page: Page, locale = 'en') {
  const calls = await consoleSession(page, 'super_admin', locale, locale);
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const name = url.pathname.split('/').pop();
    if (name === 'product_options')
      return route.fulfill({
        json: {
          sourcing: {
            product_id: productId,
            preparation_min: 1,
            preparation_max: 5,
            dispatch_location: 'Dhaka',
            packaging: 'Carton',
            delivery_notes: 'Confirm delivery with supplier.',
            samples_enabled: false,
            sample_limit: 1,
            customization_enabled: false,
            customization_moq: 10,
            estimates_updated_at: null,
            version: 1,
          },
          attributes: [],
          skus: [],
        },
      });
    if (name === 'admin_list' && request.postDataJSON()?.kind === 'products') {
      const body = request.postDataJSON();
      calls.push({ name, body });
      const rows = [0, 1].map((index) => ({
        id: index ? 'a4000000-0000-4000-8000-000000000002' : productId,
        business_id: businessId,
        category_id: userId,
        name: index
          ? 'Handcrafted dining chair with natural wood finish for wholesale buyers'
          : 'Premium cotton wholesale shirts',
        name_bn: index ? 'পাইকারি কাঠের চেয়ার' : 'পাইকারি সুতির শার্ট',
        description:
          'Synthetic listing used only for moderation layout tests. Clear materials, packaging and supply information.',
        price: index ? 1950 : 185,
        moq: 10,
        stock: 500,
        unit: 'piece',
        specifications: {
          Material: 'Cotton',
          Packaging: 'Protective wholesale carton',
          'Country of origin': 'Bangladesh',
        },
        status: index ? 'approved' : 'pending',
        moderation_note: '',
        created_at: '2026-10-16T04:00:00Z',
        updated_at: '2026-10-16T04:00:00Z',
        supplier_name: 'Synthetic Textile Manufacturing & Wholesale Limited',
        images: index
          ? []
          : [1, 2, 3].map((number) => ({
              id: `image-${number}`,
              path: `moderation/${number}.webp`,
              position: number - 1,
              product_id: productId,
            })),
        tiers: index
          ? []
          : [
              { min_quantity: 10, price: 185 },
              { min_quantity: 100, price: 170 },
            ],
      }));
      return route.fulfill({ json: { total: 2, rows } });
    }
    if (request.method() === 'GET' && url.pathname.includes('/storage/'))
      return route.fulfill({
        path: 'public/images/photo-1489987707025-afc232f7ea0f-640.webp',
        contentType: 'image/webp',
      });
    return route.fallback();
  });
  return calls;
}

for (const locale of ['en', 'bn']) {
  test(`product moderation has structured details, expandable listings and usable image previews (${locale})`, async ({
    page,
  }) => {
    await moderationFixture(page, locale);
    for (const width of test.info().project.name === 'mobile' ? [320, 390] : [768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/admin/products');
      const cards = page.locator('.pm-card');
      await expect(cards).toHaveCount(2);
      await expect(cards.first().locator('.pm-review')).toBeVisible();
      await expect(cards.nth(1).locator('.pm-review')).toHaveCount(0);
      await expect(cards.first().locator('.pm-specifications')).toContainText('Cotton');
      await expect(cards.first().locator('.pm-gallery img')).toHaveCount(3);
      await expect(cards.first().locator('.review-decision-actions > button')).toHaveCount(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts/moderation-expanded-${locale}-${width}.png`,
        fullPage: true,
      });
      await cards.first().locator('.pm-gallery button').first().click();
      const preview = page.locator('.pm-image-dialog[open]');
      await expect(preview).toBeVisible();
      await preview.locator('.pm-preview-navigation button').last().click();
      await expect(preview.locator('.pm-preview-toolbar')).toContainText('2 / 3');
      await page.keyboard.press('Escape');
      await expect(preview).toHaveCount(0);
      await expect(cards.first().locator('.pm-gallery button').first()).toBeFocused();
      await cards.first().locator('.pm-expand').click();
      await expect(cards.first().locator('.pm-review')).toHaveCount(0);
      await cards.nth(1).locator('.pm-expand').click();
      await expect(cards.nth(1).locator('.pm-empty')).toHaveCount(2);
      await page.screenshot({
        path: `artifacts/moderation-${locale}-${width}.png`,
        fullPage: true,
      });
    }
  });
}

test('product moderation retains confirmation, required notes and server-side filters', async ({
  page,
}) => {
  const calls = await moderationFixture(page);
  await page.goto('/admin/products');
  const card = page.locator('.pm-card').first();
  await card.getByRole('button', { name: 'Approve', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Approve', exact: true });
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Review note is required.');
  expect(calls.filter((call) => call.name === 'moderate_product')).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await card
    .getByRole('textbox', { name: 'Review note' })
    .fill('Photos, specifications and pricing reviewed.');
  await card.getByRole('button', { name: 'Approve', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Approve', exact: true });
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(calls.find((call) => call.name === 'moderate_product')?.body).toEqual({
    target: productId,
    decision: 'approved',
    note: 'Photos, specifications and pricing reviewed.',
  });
  await expect(card.getByRole('status')).toContainText('Listing decision saved.');
  await page.getByRole('combobox', { name: 'Listing status', exact: true }).selectOption('pending');
  await expect
    .poll(() => calls.filter((call) => call.name === 'admin_list').at(-1)?.body.filters)
    .toMatchObject({ status: 'pending' });
});
