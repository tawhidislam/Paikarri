import { test, expect, type Page } from '@playwright/test';
import { defaultHomepage } from '../../src/lib/operations-schema';
const uid = 'c1000000-0000-4000-8000-000000000001';
const supplier = 'c1000000-0000-4000-8000-000000000002';
const business = 'c2000000-0000-4000-8000-000000000001';
async function operationsSession(page: Page, role = 'super_admin') {
  const calls: { name: string; body: Record<string, unknown> }[] = [];
  let revision = 1;
  let draft = { ...defaultHomepage };
  let published: typeof defaultHomepage | null = null;
  let read = false;
  let reminder: string | null = null;
  await page.addInitScript(
    ({ uid }) => {
      const now = Math.floor(Date.now() / 1000);
      const access_token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: uid, role: 'authenticated', exp: now + 3600 }))}.test`;
      localStorage.setItem(
        'sb-zhllnfciehxmjahljrhb-auth-token',
        JSON.stringify({
          access_token,
          refresh_token: 'test',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: now + 3600,
          user: {
            id: uid,
            email: 'operator@example.invalid',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: { provider: 'email' },
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        }),
      );
      localStorage.setItem('paikari-locale', 'en');
    },
    { uid },
  );
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!;
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    calls.push({ name, body });
    let data: unknown = null;
    if (name === 'user_roles') data = { role };
    else if (name === 'get_account_status') data = { status: 'active', reason: '' };
    else if (name === 'get_platform_settings')
      data = {
        name_en: 'Paikarii.com',
        name_bn: 'Paikarii.com',
        tagline_en: 'Local business',
        tagline_bn: 'Local business BN',
        support_email: '',
        support_phone: '',
        default_locale: 'en',
        supplier_registration_open: true,
      };
    else if (name === 'get_homepage_content') data = published;
    else if (name === 'admin_homepage_state')
      data = {
        revision,
        draft,
        published,
        published_at: published ? '2026-10-17T00:00:00Z' : null,
      };
    else if (name === 'admin_save_homepage') {
      draft = body.config as typeof draft;
      revision++;
      data = revision;
    } else if (name === 'admin_publish_homepage') {
      published = { ...draft };
      revision++;
    } else if (name === 'notification_unread_count') data = read ? 0 : 1;
    else if (name === 'get_notification_inbox')
      data = {
        total: read && body.unread_only ? 0 : 1,
        rows:
          read && body.unread_only
            ? []
            : [
                {
                  id: 'c3000000-0000-4000-8000-000000000001',
                  recipient_id: uid,
                  kind: 'product_review',
                  title_en: 'Product review updated',
                  title_bn: 'Product review BN',
                  body_en: 'Your listing was approved after review.',
                  body_bn: 'Review message BN',
                  href: '/dashboard/products',
                  entity_id: null,
                  actor_id: null,
                  created_at: '2026-10-17T00:00:00Z',
                  read_at: read ? '2026-10-17T01:00:00Z' : null,
                },
              ],
      };
    else if (name === 'mark_notification') read = !!body.is_read;
    else if (name === 'mark_all_notifications_read') read = true;
    else if (name === 'admin_operations_list')
      data =
        body.kind === 'onboarding'
          ? {
              total: 1,
              rows: [
                {
                  id: supplier,
                  full_name: 'Supplier applicant',
                  email: 'supplier@example.invalid',
                  business_id: business,
                  name: 'Test manufacturing',
                  status: 'active',
                  stage: 'profile_missing',
                  completion: 0,
                  profile_complete: false,
                  approved_documents: 0,
                  pending_documents: 0,
                  rejected_documents: 0,
                  products: 0,
                  approved_products: 0,
                  pending_products: 0,
                  products_with_images: 0,
                  last_reminded_at: reminder,
                  created_at: '2026-10-17T00:00:00Z',
                },
              ],
            }
          : { total: 0, rows: [] };
    else if (name === 'admin_send_onboarding_reminder') {
      reminder = '2026-10-17T01:00:00Z';
      data = 'c4000000-0000-4000-8000-000000000001';
    } else if (name === 'admin_list') data = { total: 0, rows: [] };
    else if (
      [
        'search_products',
        'public_products',
        'public_businesses',
        'categories',
        'product_images',
      ].includes(name)
    )
      data = [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/0' },
      body: JSON.stringify(data),
    });
  });
  return calls;
}
test('homepage editor saves privately, previews and explicitly publishes', async ({ page }) => {
  const calls = await operationsSession(page);
  await page.goto('/admin/homepage');
  await expect(page.getByRole('heading', { name: 'Homepage content', exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Hero title (English)', exact: true })
    .fill('Source Bangladesh wholesale');
  await page.getByRole('button', { name: 'Preview homepage', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Source Bangladesh wholesale', exact: true }),
  ).toBeVisible();
  expect(calls.some((c) => c.name === 'admin_publish_homepage')).toBe(false);
  await page.getByRole('button', { name: 'Close preview', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => calls.some((c) => c.name === 'admin_save_homepage')).toBe(true);
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  expect(calls.find((c) => c.name === 'admin_save_homepage')?.body.expected_revision).toBe(1);
  await page.getByRole('button', { name: 'Publish homepage', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Publish homepage' });
  await expect(dialog).toBeVisible();
  expect(calls.some((c) => c.name === 'admin_publish_homepage')).toBe(false);
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Source Bangladesh wholesale', exact: true }),
  ).toBeVisible();
});
test('staff can view onboarding and confirm a predefined in-app reminder', async ({ page }) => {
  const calls = await operationsSession(page, 'admin');
  await page.goto('/admin/onboarding');
  await expect(page.getByText('supplier@example.invalid', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Send profile reminder', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Send profile reminder' });
  await expect(dialog).toBeVisible();
  expect(calls.some((c) => c.name === 'admin_send_onboarding_reminder')).toBe(false);
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(calls.find((c) => c.name === 'admin_send_onboarding_reminder')?.body).toEqual({
    target: supplier,
    template: 'profile',
  });
  await page.goto('/admin/homepage');
  await expect(page.getByRole('heading', { name: 'Access restricted', exact: true })).toBeVisible();
});
test('recipient inbox updates read state and unread filter without allowing content edits', async ({
  page,
}) => {
  const calls = await operationsSession(page, 'supplier');
  await page.goto('/dashboard/notifications');
  await expect(
    page.getByRole('heading', { name: 'Product review updated', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mark read', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark unread', exact: true })).toBeVisible();
  expect(calls.find((c) => c.name === 'mark_notification')?.body.is_read).toBe(true);
  await page.getByRole('button', { name: 'Mark unread', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark read', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Inbox filter', exact: true }).selectOption('unread');
  await page
    .getByRole('button', { name: 'Mark all as read', exact: true })
    .click({ timeout: 10000 });
  await expect(
    page.getByRole('heading', { name: 'No notifications yet', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('buyer cannot reach operations data; delivery log describes in-app status', async ({
  page,
}) => {
  await operationsSession(page, 'buyer');
  await page.goto('/admin/onboarding');
  await expect(page.getByRole('heading', { name: 'Access restricted', exact: true })).toBeVisible();
});
test('owner delivery log and editor fit the viewport', async ({ page }) => {
  await operationsSession(page);
  await page.goto('/admin/notifications');
  await expect(page.getByText(/Delivered means stored in the recipient inbox/)).toBeVisible();
  await page.goto('/admin/homepage');
  await expect(page.getByRole('heading', { name: 'Hero banner', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/homepage-editor-${test.info().project.name}.png`,
    fullPage: true,
  });
});
